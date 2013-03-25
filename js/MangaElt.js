/* Object manga */
XMLHttpRequest.prototype.mangaEltRef = null;
XMLHttpRequest.prototype.extensionRef = null;
HTMLLinkElement.prototype.mangaEltRef = null;
HTMLLinkElement.prototype.divDelete = null;
HTMLLinkElement.prototype.divNormal = null;
HTMLLinkElement.prototype.mirror = null;
HTMLInputElement.prototype.mirror = null;

Array.prototype.remove = function (from, to) {
  "use strict";
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

function isArray(obj) {
  "use strict";
  if (obj.constructor.toString().indexOf("Array") === -1) {
    return false;
  }
  return true;
}

function MangaElt(obj) {
  "use strict";
  this.mirror = obj.mirror;
  this.name = obj.name;
  this.url = obj.url;
  if (obj.lastChapterReadURL !== undefined) {
    this.lastChapterReadURL = obj.lastChapterReadURL;
    this.lastChapterReadName = obj.lastChapterReadName;
  } else {
    this.lastChapterReadURL = null;
    this.lastChapterReadName = null;
  }
  this.listChaps = [];
  if (obj.listChaps !== undefined && obj.listChaps !== null && obj.listChaps !== "null") {
    if (!isArray(obj.cats)) {
      // this.listChaps = $A(eval('(' + obj.listChaps + ')')); --> remove eval function
      this.listChaps = JSON.parse(obj.listChaps);
    }
  }
  this.read = 0;
  if (obj.read !== undefined && obj.read !== null && obj.read !== "null") {
    this.read = obj.read;
  }
  this.update = 1;
  if (obj.update !== undefined && obj.update !== null && obj.update !== "null") {
    this.update = obj.update;
  }
  this.display = 0;
  if (obj.display !== undefined && obj.display !== null && obj.display !== "null") {
    this.display = obj.display;
  }
  this.cats = [];
  if (obj.cats !== undefined && obj.cats !== null && obj.cats !== "null") {
    if (isArray(obj.cats)) {
      this.cats = obj.cats;
    } else {
      // this.cats = $A(eval('(' + obj.cats + ')')); --> remove eval function
      this.cats = JSON.parse(obj.cats);
    }
  }
  this.ts = Math.round((new Date()).getTime() / 1000);
  if (obj.ts !== undefined && obj.ts !== null && obj.ts !== "null") {
    this.ts = obj.ts;
  }
  this.upts = 0;
  if (obj.upts !== undefined && obj.upts !== null && obj.upts !== "null") {
    this.upts = obj.upts;
  }

  this.consult = function (obj, fromSite) {
    if (fromSite === undefined) {
      fromSite = false;
    }
    var posOld = -1,
      posNew = -1,
      isNew = false,
      i;

    for (i = 0; i < this.listChaps.length; i += 1) {
      if (this.listChaps[i][1] === this.lastChapterReadURL) {
        posOld = i;
      }
      if (this.listChaps[i][1] === obj.lastChapterReadURL) {
        posNew = i;
      }
    }
    if (posNew === -1) {
      //New chapter is not in chapters list --> Reload chapter list
      if (getMangaMirror(this.mirror) !== null && this.update === 1) {
        getMangaMirror(this.mirror).getListChaps(this.url, this.name, this, function (lst, obj2) {
          if (lst.length > 0) {
            obj2.listChaps = lst;
            for (i = 0; i < lst.length; i += 1) {
              if (lst[i][1] === obj2.lastChapterReadURL) {
                posOld = i;
              }
              if (lst[i][1] === obj.lastChapterReadURL) {
                posNew = i;
              }
            }
            if (posNew !== -1) {
              if (fromSite || (posNew < posOld || posOld === -1)) {
                obj2.lastChapterReadURL = obj.lastChapterReadURL;
                obj2.lastChapterReadName = obj.lastChapterReadName;
                if (!fromSite) {
                  obj2.ts = Math.round((new Date()).getTime() / 1000);
                }
              }
            }
            saveList();
          }
        });
      }
    } else {
      if (fromSite || (posNew < posOld || posOld === -1)) {
        this.lastChapterReadURL = obj.lastChapterReadURL;
        this.lastChapterReadName = obj.lastChapterReadName;
        if (!fromSite) {
          this.ts = Math.round((new Date()).getTime() / 1000);
        }
      }
    }

    //This happens when incoming updates comes from sync
    //if obj.display, obj.read, obj.cats, MAJ this....
    if (obj.display !== undefined) {
      this.display = obj.display;
    }
    if (obj.read !== undefined) {
      this.read = obj.read;
    }
    if (obj.update !== undefined) {
      this.update = obj.update;
    }
    if (obj.cats !== undefined && obj.cats !== null && obj.cats !== "null") {
      if (isArray(obj.cats)) {
        this.cats = obj.cats;
      } else {
        // this.cats = $A(eval('(' + obj.cats + ')')); --> remove eval function
        this.cats = JSON.parse(obj.cats);
      }
    }

    if (obj.ts !== undefined && fromSite) {
      this.ts = obj.ts;
    }
  };

  this.refreshLast = function (doSave, callback) {
    if (this.update === 1) {
      //Refresh the last existing chapter of this manga
      if (doSave === undefined) {
        doSave = true;
      }
      var myself = this,
        hasBeenTimeout = false,
        timeOutRefresh = setTimeout(function () {
          hasBeenTimeout = true;
          console.log("Refreshing " + myself.url + " has been timeout... seems unreachable...");
          if (callback !== undefined && typeof callback === 'function') {
            callback(myself);
          }
        }, 60000);

      setTimeout(function () {
        if (getMangaMirror(myself.mirror) !== null) {
          getMangaMirror(myself.mirror).getListChaps(myself.url, myself.name, myself, function (lst, obj) {
            clearTimeout(timeOutRefresh);
            if (lst.length > 0) {
              var parameters = JSON.parse(localStorage.parameters),
                oldLastChap = (typeof obj.listChaps[0] === 'object' ? obj.listChaps[0][1] : undefined),
                newLastChap,
                urls,
                mangaData,
                notification;
              obj.listChaps = lst;
              newLastChap = obj.listChaps[0][1];
              // if oldLastChap === undefined --> new manga added --> no notifications (Issue #40)
              if ((newLastChap !== oldLastChap) && (oldLastChap !== undefined)) {
                if (obj.read === 0 && (parameters.shownotifications === 1)) {
                  urls = $.map(obj.listChaps, function (chap) {return chap[1]; });
                  mangaData = {name: obj.name, mirror: obj.mirror, url: urls[urls.indexOf(obj.lastChapterReadURL) - 1]};
                  /*notification = window.webkitNotifications.createHTMLNotification('notification.html#' + JSON.stringify(mangaData));
                  notification.show();
                  if (parameters.notificationtimer > 0) {
                    setTimeout(function () {
                      notification.cancel();
                    }, parameters.notificationtimer * 1000);
                  }*/
                  var description = "... has new chapter(s) on " + mangaData.mirror + "! Click anywhere to open the next unread chapter."
                  var notif = window.webkitNotifications.createNotification(
                        chrome.extension.getURL('img/icon-32.png'), mangaData.name, description);
                  notif.url = mangaData.url;
                  notif.onclick = function() {
                    var _url = this.url;
                    chrome.tabs.create({
                      "url" : _url
                    });
                  };
                  notif.show();
                  if (parameters.notificationtimer > 0) {
                    setTimeout(function () {
                      notif.cancel();
                    }, parameters.notificationtimer * 1000);
                  }
                  //console.log('A new chapter of "' + mangaList[i].name + '" was issued by "' + mangaList[i].mirror + '".');
                }
                //Set upts to now (means : 'last time we found a new chapter is now');
                obj.upts = new Date().getTime();
              }
              if (obj.lastChapterReadURL === null) {
                obj.lastChapterReadURL = lst[lst.length - 1][1];
                obj.lastChapterReadName = lst[lst.length - 1][0];
                obj.ts = Math.round((new Date()).getTime() / 1000);
                //console.log("New last : " + obj.lastChapterReadURL);
              }
              if (doSave || hasBeenTimeout) {
                saveList();
              }
            }

            if (callback !== undefined && typeof callback === 'function' && !hasBeenTimeout) {
              callback(obj);
            }
          });
        }
      }, 10);
    } else {
      callback(this);
    }
  };
}

