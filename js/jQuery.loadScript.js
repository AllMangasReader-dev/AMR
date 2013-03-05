jQuery.loadScript = function (url, arg1, arg2, errorfunc, datatyp) {
    "use strict";
    var cache = false,
        callback = null,
        load = true,
        datatype = datatyp || 'script';
    //arg1 and arg2 can be interchangable
    if ($.isFunction(arg1)) {
        callback = arg1;
        cache = arg2 || cache;
    } else {
        cache = arg1 || cache;
        callback = arg2 || callback;
    }
    //check all existing script tags in the page for the url
    jQuery('script[type="text/javascript"]').each(function () {
        load = (url !== $(this).attr('src'));
    });
    if (load) {
        //didn't find it in the page, so load it
        jQuery.ajax({
            type : 'GET',
            url : url,
            success : callback,
            error: errorfunc,
            dataType : datatype,
            cache : cache
        });
    } else {
        //already loaded so just call the callback
        if (jQuery.isFunction(callback)) {
            callback.call(this);
        }
    }
};
