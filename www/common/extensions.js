define([
    'optional!/extensions.js'
], (Extensions) => {
    const ext = {};
    if (!Array.isArray(Extensions) || !Extensions.length) { return ext; }

    let all = Extensions.slice();
    while(all.length) {
        let current = all.splice(0, 3);

        let f = current[0];
        if (typeof(f) !== "function") {
            continue;
        }
        let defaultLang = current[1];
        let lang = current[2];
        if (!Object.keys(lang).length && Object.keys(defaultLang).length) {
            lang = defaultLang;
        }

        lang._getKey = function (key, argArray) {
            if (!lang[key]) { return '?'; }
            var text = lang[key];
            if (typeof(text) === 'string') {
                return text.replace(/\{(\d+)\}/g, function (str, p1) {
                    if (typeof(argArray[p1]) === 'string' || typeof(argArray[p1]) === "number") {
                        return argArray[p1];
                    }
                    return '';
                });
            } else {
                return text;
            }
        };

        let currentExt = f(lang) || {};

        Object.keys(currentExt).forEach(key => {
            ext[key] = ext[key] || [];
            Array.prototype.push.apply(ext[key], currentExt[key]); // concat in place
        });
    }

    ext.getExtensions = id => {
        let e = ext[id];
        if (!Array.isArray(e)) { e = []; }
        return e;
    };

    return ext;
});
