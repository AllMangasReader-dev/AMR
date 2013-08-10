(function() {
    "use strict";
    chrome.extension.sendRequest({action: "pagematchurls", url: window.location.href }, function(response) {
        if(response.isOk) {
            removeBanner();
            initPage();
        }
    });
})();