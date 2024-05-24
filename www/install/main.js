// SPDX-FileCopyrightText: 2023 XWiki CryptPad Team <contact@cryptpad.org> and contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

define([
    'jquery',
    '/customize/login.js',
    '/common/cryptpad-common.js',
    '/common/common-credential.js',
    '/common/common-interface.js',
    '/common/common-util.js',
    '/common/common-realtime.js',
    '/common/common-constants.js',
    '/common/common-feedback.js',
    '/common/outer/local-store.js',
    '/common/hyperscript.js',
    '/customize/pages.js',
    '/common/rpc.js',
    'appconfigscreen.js',
    '/common/inner/sidebar-layout.js',

    'css!/components/components-font-awesome/css/font-awesome.min.css',
], function ($, Login, Cryptpad, /*Test,*/ Cred, UI, Util, Realtime, Constants, Feedback, LocalStore, h, Pages, Rpc, AppConfigScreen, Sidebar) {
    if (window.top !== window) { return; }
    var Messages = Cryptpad.Messages;
    $(function () {

        Messages.admin_appSelection = 'App configuration saved'
        Messages.admin_appsTitle = "Choose your applications"
        Messages.admin_appsHint = "Choose which apps are available to users on your instance."
        Messages.admin_cat_apps = "Apps"
        if (LocalStore.isLoggedIn()) {
            // already logged in, redirect to drive
            document.location.href = '/drive/';
            return;
        }


        // text and password input fields
        var $token = $('#installtoken');
        var $uname = $('#username');
        var $passwd = $('#password');
        var $confirm = $('#password-confirm');

        [ $token, $uname, $passwd, $confirm]
        .some(function ($el) { if (!$el.val()) { $el.focus(); return true; } });

        // checkboxes
        var $register = $('button#register');

        var I_REALLY_WANT_TO_USE_MY_EMAIL_FOR_MY_USERNAME = false;
        var br = function () { return h('br'); };

        // If the token is provided in the URL, hide the field
        var token;
        if (window.location.hash) {
            var hash = window.location.hash.slice(1);
            if (hash.length === 64) {
                token = hash;
                $token.hide();
                console.log(`Install token: ${token}`);
            }
        }

        var showScreen = function (sendAdminDecree) {

            const blocks = Sidebar.blocks;
            var availableApps = AppConfigScreen[0]
            var grid = AppConfigScreen[1]
            
            var save = blocks.activeButton('primary', '', Messages.settings_save, function (done) {
                sendAdminDecree('DISABLE_APPS', availableApps, function (e, response) {
                  
                    if (e || response.error) {
                        UI.warn(Messages.error);
                        $input.val('');
                        console.error(e, response);
                        done(false);
                        return;
                    }
                    // flushCache();
                    done(true);
                    UI.log(Messages._getKey('ui_saved', [Messages.admin_appSelection]));
                    window.location.href = '/drive/';

                })
                UI.log('Messages._getKey(, [Messages.admin_appSelection])');
            });

            
            let form = blocks.form([
                grid 
            ], blocks.nav([save]));

            var elem = document.createElement('div');
            elem.setAttribute('id', 'cp-loading');
            let frame = h('div.configscreen',  {style: 'width: 70%; height: 75%; background-color: white'}, form)
            elem.append(frame)

            built = true;
            var intr;
            var append = function () {
                if (!document.body) { return; }
                clearInterval(intr);
                document.body.appendChild(elem);
            };
            intr = setInterval(append, 100);
            append();


        }

        var registerClick = function () {

            var uname = $uname.val().trim();
            // trim whitespace surrounding the username since it is otherwise included in key derivation
            // most people won't realize that its presence is significant
            $uname.val(uname);

            var passwd = $passwd.val();
            var confirmPassword = $confirm.val();

            if (!token) { token = $token.val().trim(); }

            var shouldImport = false;
            var doesAccept;
            try {
                // if this throws there's either a horrible bug (which someone will report)
                // or the instance admins did not configure a terms page.
                doesAccept = true;
            } catch (err) {
                console.error(err);
            }

            if (Cred.isEmail(uname) && !I_REALLY_WANT_TO_USE_MY_EMAIL_FOR_MY_USERNAME) {
                var emailWarning = [
                    Messages.register_emailWarning0,
                    br(), br(),
                    Messages.register_emailWarning1,
                    br(), br(),
                    Messages.register_emailWarning2,
                    br(), br(),
                    Messages.register_emailWarning3,
                ];

                Feedback.send("EMAIL_USERNAME_WARNING", true);

                return void UI.confirm(emailWarning, function (yes) {
                    if (!yes) { return; }
                    I_REALLY_WANT_TO_USE_MY_EMAIL_FOR_MY_USERNAME = true;
                    registerClick();
                });
            }

            /* basic validation */
            if (!Cred.isLongEnoughPassword(passwd)) {
                var warning = Messages._getKey('register_passwordTooShort', [
                    Cred.MINIMUM_PASSWORD_LENGTH
                ]);
                return void UI.alert(warning);
            }

            if (passwd !== confirmPassword) { // do their passwords match?
                return void UI.alert(Messages.register_passwordsDontMatch);
            }

            if (Pages.customURLs.terms && !doesAccept) { // do they accept the terms of service? (if they exist)
                return void UI.alert(Messages.register_mustAcceptTerms);
            }

            let startOnboarding = function (network, proxy) {
             Rpc.create(network, proxy.edPrivate, proxy.edPublic, function (e, rpc) {
                if (e) {
                  // TODO: handle error
                  return;
                }

                let sendAdminDecree = function (command, data, callback) {
                    var params = ['ADMIN_DECREE', [command, data]];  
                    rpc.send('ADMIN', params, callback)
                };

                showScreen(sendAdminDecree)
              
            });
  
    };

            setTimeout(function () {
                var span = h('span', [
                    h('h2', [
                        h('i.fa.fa-warning'),
                        ' ',
                        Messages.register_warning,
                    ]),
                    Messages.register_warning_note
                ]);

            UI.confirm(span,
            function (yes) {
                if (!yes) { return; }

                Login.loginOrRegisterUI({
                    uname,
                    passwd,
                    isRegister: true,
                    onOTP: UI.getOTPScreen,
                    shouldImport,
                    cb: function (data) {
                        var proxy = data.proxy;
                        if (!proxy || !proxy.edPublic) { UI.alert(Messages.error); return true; }

                        Rpc.createAnonymous(data.network, function (e, call) {
                            if (e) { UI.alert(Messages.error); return console.error(e); }
                            var anon_rpc = call;

                            anon_rpc.send('ADD_FIRST_ADMIN', {
                                token: token,
                                edPublic: proxy.edPublic
                            }, function (e) {
                                if (e) { UI.alert(Messages.error); return console.error(e); }
                                            // bloop(sendAdminDecree)

                                startOnboarding(data.network, proxy);
                            });
                        });

                        return true;
                    }
                });
            }, {
                ok: Messages.register_writtenPassword,
                cancel: Messages.register_cancel,
/*  If we're certain that we aren't using these "*Class" APIs
    anywhere else then we can deprecate them and make this a
    custom modal in common-interface (or here).  */
                cancelClass: 'btn.btn-cancel.btn-register',
                okClass: 'btn.btn-danger.btn-register',
                reverseOrder: true,
                done: function ($dialog) {
                    $dialog.find('> div').addClass('half');
                },
            });
            }, 150);

            //                 let sendAdminDecree = function (command, data, callback) {
 
            //     };
            // bloop(sendAdminDecree)


        };

        $register.click(registerClick);

        var clickRegister = Util.notAgainForAnother(function () {
            $register.click();
        }, 500);

        $register.on('keypress', function (e) {
            if (e.which === 13) {
                e.preventDefault();
                e.stopPropagation();
                return clickRegister();
            }
        });
    });
});
