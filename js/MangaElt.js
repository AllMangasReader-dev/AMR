﻿/**

  This file is part of All Mangas Reader.

  All Mangas Reader is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  All Mangas Reader is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with All Mangas Reader.  If not, see <http://www.gnu.org/licenses/>.

*/

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

function MangaElt(obj) {
  "use strict";
  this.mirror = obj.mirror;
  this.name = obj.name;
  this.url = obj.url;
  this.lastChapterReadURL = obj.lastChapterReadURL || null;
  this.lastChapterReadName = obj.lastChapterReadName || null;
  this.listChaps = [];
  if (obj.listChaps) {
    this.listChaps = JSON.parse(obj.listChaps)
  }
  this.read = obj.read || 0;
  this.update = obj.update || 1;
  this.display = obj.display || 0;
  this.cats = obj.cats || [];
  if (obj.cats) {
    this.cats = JSON.parse(obj.cats);
  }  
  this.ts = obj.ts || Math.round((new Date()).getTime() / 1000);
  this.upts = obj.upts || 0;

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
    if (!obj.display) {
      this.display = obj.display;
    }
    if (!obj.read) {
      this.read = obj.read;
    }
    if (!obj.update) {
      this.update = obj.update;
    }
    if (obj.cats !== undefined && obj.cats !== null) {
        this.cats = JSON.parse(obj.cats) || obj.cats || [];
    }
    if (!obj.ts && fromSite) {
      this.ts = obj.ts;
    }
  };

  this.refreshLast = function (doSave, callback) {
    if (this.update === 1) {
      //Refresh the last existing chapter of this manga
      if (!doSave) {
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
                  var description = "... has new chapter(s) on " + mangaData.mirror + "! Click anywhere to open the next unread chapter.";
                  var notif = window.webkitNotifications.createNotification(
                        chrome.extension.getURL('img/icon-32.png'), mangaData.name, description);
                  notif.url = mangaData.url;
                  notif.onclick = function() {
                    var _url = this.url;
                    // notif.cancel() should hide the notif once clicked
                    notif.cancel();
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
                }
                //Set upts to now (means : 'last time we found a new chapter is now');
                obj.upts = new Date().getTime();
              }
              if (obj.lastChapterReadURL === null) {
                obj.lastChapterReadURL = lst[lst.length - 1][1];
                obj.lastChapterReadName = lst[lst.length - 1][0];
                obj.ts = Math.round((new Date()).getTime() / 1000);
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

