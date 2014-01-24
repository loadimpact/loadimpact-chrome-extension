require('app/scripts/application');
require('app/templates/compiled');
require('app/lib/bootstrap/alert');
require('app/lib/codemirror/lib/codemirror');
require('app/scripts/codemirror.lua.li');

'use strict';

var STATUS_CODE_TO_ERROR_MESSAGE = {
    401: 'Either you have not entered an API token or the one you have entered is not valid.',
    409: 'You already have a user scenario with the specified name.',
    429: 'You have made too many requests to the Load Impact API, please try again in a few minutes.'
};

LI.Router.map(function() {
    this.route('editor');
});

LI.IndexRoute = Ember.Route.extend({
    beforeModel: function() {
        this.transitionTo('editor');
    }
});

LI.EditorRoute = Ember.Route.extend({
    model: function () {
        TEST_1234 = 2;
        TEST_5678 = 2;
        return this.get('store').find('options', 1);
    },

    setupController: function(controller, model) {
        controller.set('model', model);
    }
});

LI.EditorController = Ember.ObjectController.extend({
    errorMsg: null,
    savedUserScenarioId: null,

    actions: {
        save: function() {
            var self = this;
            $.ajax({
                type: 'POST',
                url: this.get('apiUrl') + 'user-scenarios/',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(self.get('apiToken') + ':'));
                },
                contentType: 'application/json; charset=UTF-8',
                dataType: 'json',
                data: JSON.stringify({
                    name: $('#name').val(),
                    load_script: $('#load-script').val()
                }),
                success: function(data, textStatus, jqXHR) {
                    $('#editor-form').hide();
                    self.set('savedUserScenarioId', data['id']);
                    $('#success').removeClass('hidden');
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    var errorMsg = '',
                        statusCode = jqXHR.status,
                        msgText = function() {
                            var msg = '';
                            if (textStatus) {
                                msg += textStatus;
                            }
                            if (errorThrown) {
                                if (msg) {
                                    msg += ', ';
                                }
                                msg += errorThrown;
                            }
                            return msg;
                        };
                    if (400 <= statusCode && 599 >= statusCode) {
                        var msg = STATUS_CODE_TO_ERROR_MESSAGE[statusCode];
                        if (!msg) {
                            msg = jqXHR.responseText;
                            if (msg) {
                                try {
                                    var apiResponse = JSON.parse(msg);
                                    if (apiResponse.message) {
                                        msg = apiResponse.message;
                                    }
                                } catch (e) {
                                    // Ignore JSON parse errors.
                                }
                            } else {
                                msg = msgText();
                            }
                        }
                        errorMsg = msg + ' (' + statusCode + ')';
                    } else {
                        errorMsg = msgText();
                    }
                    self.set('errorMsg', errorMsg);
                }
            });
            return false;
        },

        continueEditingOnSite: function() {
            window.location.href = ('https://loadimpact.com/test/user-scenario/list?s=' +
                                    this.get('savedUserScenarioId'));
        }
    },
});

LI.EditorView = Ember.View.extend({
    didInsertElement: function() {
        var msg = {
            'type': 'get-last-recorded-script',
        };
        chrome.extension.sendRequest(msg, function(response) {
            console.log(response.loadScript);
            $('#name').val('Recorded (' + (new Date()).toString() + ')');
            var textarea = $('#load-script');
            textarea.val(response.loadScript);
            window.Editor = CodeMirror.fromTextArea(textarea.get(0), {
                mode: 'lua',
                lineNumbers: true,
                lineWrapping: true,
                tabMode: 'indent'
            });
        });
    }
});

/**
 * If the editor has any content, prompt the user before navigating to another page.
 */
window.onbeforeunload = function() {
    if (window.Editor.getValue()) {
        return "The recorded scenario will be lost if you navigate to another page.";
    }
};