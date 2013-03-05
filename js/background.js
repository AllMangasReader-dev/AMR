// The eval functions are market with (***), if you like to hunt them donw, just find those.
//jQuery.noConflict();
var mangaList;
var mirrors;
var ctxIds = [];
var bookmarks;
var actMirrors;
var timeoutChap;
var timeoutMg;
var timeoutWs;
var updatews = 86400 * 1000;

//Init databases
pstat.init();
wssql.init();
amrcsql.init();

var betaversion = "1.5.0";

/**
 * Returns the week number for this date.  dowOffset is the day of week the week
 * "starts" on for your locale - it can be from 0 to 6. If dowOffset is 1 (Monday),
 * the week returned is the ISO 8601 week number.
 * @param int dowOffset
 * @return int
 */
Date.prototype.getWeek = function (dowOffset) {
  /*getWeek() was developed by Nick Baicoianu at MeanFreePath: http://www.meanfreepath.com */

  dowOffset = typeof(dowOffset) == 'int' ? dowOffset : 0; //default dowOffset to zero
  var newYear = new Date(this.getFullYear(), 0, 1);
  var day = newYear.getDay() - dowOffset; //the day of week the year begins on
  day = (day >= 0 ? day : day + 7);
  var daynum = Math.floor((this.getTime() - newYear.getTime() -
        (this.getTimezoneOffset() - newYear.getTimezoneOffset()) * 60000) / 86400000) + 1;
  var weeknum;
  //if the year starts before the middle of a week
  if (day < 4) {
    weeknum = Math.floor((daynum + day - 1) / 7) + 1;
    if (weeknum > 52) {
      nYear = new Date(this.getFullYear() + 1, 0, 1);
      nday = nYear.getDay() - dowOffset;
      nday = nday >= 0 ? nday : nday + 7;
      /*if the next year starts before the middle of
      the week, it is week #1 of that year*/
      weeknum = nday < 4 ? 1 : 53;
    }
  } else {
    weeknum = Math.floor((daynum + day - 1) / 7);
  }
  return weeknum;
};
// Here we shouldn't be using this...
var sync = new BSync({
    getUpdate : function () {
      //console.log('GET UPDATE');
      var params = getParameters();
      return params.updated;
    },

    onRead : function (json, bookmark) {
      console.log('Reading incoming synchronisation');

      if (!(json == undefined || json == null || json == "null")) {
        console.log(' - Updating incoming entries');
        // Here we are using eval (***)
        // var lstTmp = $A(eval('(' + json.mangas + ')')); --> remove prototype usage
        lstTmp = JSON.parse(json.mangas);
        for (var i = 0; i < lstTmp.length; i++) {
          var tmpManga = new MangaElt(lstTmp[i]);
          console.log("\t - Reading manga entry : " + tmpManga.name + " in mirror : " + tmpManga.mirror);
          var mangaExist = isInMangaList(tmpManga.url);
          if (mangaExist == null) {
            console.log("\t  --> Manga not found in current list, adding manga... ");
            if (!isMirrorActivated(tmpManga.mirror)) {
              activateMirror(tmpManga.mirror);
            }
            var last = mangaList.length;
            mangaList[last] = tmpManga;
            mangaList[last].refreshLast();
            try {
              _gaq.push(['_trackEvent', 'AddManga', tmpManga.mirror, tmpManga.name]);
              //pageTracker._trackEvent('AddManga', newManga.name);
            } catch (e) {}
          } else {
            //Verify chapter last
            console.log("\t  --> Manga found in current list, verify last chapter read. incoming : " + tmpManga.lastChapterReadURL + "; current : " + mangaExist.lastChapterReadURL);
            mangaExist.consult(tmpManga);
            saveList();
          }
        }
        console.log(' - Deleting mangas not in incoming list');
        var deleteAr = [];
        for (var i = 0; i < mangaList.length; i++) {
          var found = false;
          for (var j = 0; j < lstTmp.length; j++) {
            var tmpManga = new MangaElt(lstTmp[j]);
            if (mangaList[i].url == tmpManga.url) {
              found = true;
              break;
            }
          }
          if (!found) {
            console.log("\t - Deleting manga entry in current list : " + mangaList[i].name + " in mirror : " + mangaList[i].mirror);
            deleteAr[deleteAr.length] = i;
          }
        }
        for (var i = deleteAr.length - 1; i >= 0; i--) {
          mangaList.remove(deleteAr[i], deleteAr[i]);
        }
      }

      saveList();
      refreshUpdateWith(this.syncedAt);
      refreshSync();
    },

    onWrite : function () {
      console.log('Writing current configuration to synchronise');
      var params = getParameters();
      this.write({
        'mangas' : getJSONListToSync(),
        'updated' : params.updated,
      });
      refreshSync();
    }
  });

function replaceInUrls(url, find, rep) {
  var res = url;
  if (url != undefined && url != null && url.indexOf(find) != -1) {
    res = url.replace(find, rep);
  }
  return res;
}
/* Initialise the list of followed mangas */
function init() {
  //Test notif
  /*var mangaData = {name: "This is a long manga name... very long", mirror: "ThisIsALongMirror", url: "tets.com"}
  var notification = window.webkitNotifications.createHTMLNotification('notification.html#' + JSON.stringify(mangaData));
  notification.show();*/

  getMirrors(function (mirrorsT) {
    mirrors = mirrorsT;

    //Do not store mangas in mirrors.
    // Braiam: why the use of localStorage?
    var doDeleteMirs = false;
    for (var i = 0; i < mirrors.length; i++) {
      if (localStorage[mirrors[i].mirrorName]) {
        doDeleteMirs = true;
        localStorage.removeItem(mirrors[i].mirrorName);
      }
    }
    if (doDeleteMirs) {
      //Do refresh manga lists...
      localStorage.removeItem("lastMangasUpdate");
    }

    initMirrorState();

    actMirrors = [];
    for (var i = 0; i < mirrors.length; i++) {
      if (isMirrorActivated(mirrors[i].mirrorName)) {
        actMirrors[actMirrors.length] = mirrors[i];
      }
    }
    //console.log("init");
    //resetUpdate();

    list = localStorage["mangas"];
    mangaList = new Array();
    if (!(list == undefined || list == null || list == "null")) {
      //console.log("Liste de mangas : " + list);
      // Here we are using eval (***)
      // var lstTmp = $A(eval('(' + list + ')')); --> remove eval function
      var lstTmp = JSON.parse(list);
      console.log(lstTmp);
      console.log("Taille de la liste de mangas : " + lstTmp.length);
      for (var i = 0; i < lstTmp.length; i++) {
        //if (lstTmp[i].urlListChaps == undefined || lstTmp[i].urlListChaps == null || lstTmp[i].urlListChaps == "null" || lstTmp[i].urlListChaps == "") {
        //This test is done to remove inconsistent entries
        //} else {
        //if (lstTmp[i].mirror) {
        // ########### CONVERSION submanga.me en submanga.com
        lstTmp[i].url = replaceInUrls(lstTmp[i].url, "submanga.me", "submanga.com");
        lstTmp[i].lastChapterReadURL = replaceInUrls(lstTmp[i].lastChapterReadURL, "submanga.me", "submanga.com");

        lstTmp[i].url = replaceInUrls(lstTmp[i].url, "www.mangafox.com", "mangafox.me");
        lstTmp[i].lastChapterReadURL = replaceInUrls(lstTmp[i].lastChapterReadURL, "www.mangafox.com", "mangafox.me");

        // ################
        mangaList[i] = new MangaElt(lstTmp[i]);
        //  }

        //}
      }
    }
    //Load bookmarks
    var bms = localStorage["bookmarks"];
    //bookmarks = $A(eval('(' + bms + ')')); --> remove eval function
	// If there are no bookmarks just skip it.
    if (bms !== undefined) {
      bookmarks = JSON.parse(bms);
    } else {
      bookmarks = [];
    }

    var pars = getParameters();

    //console.log("Determine version ");
    var ancVersion = localStorage["version"];
    if (ancVersion == undefined || ancVersion == null || ancVersion == "null") {
      ancVersion = null;
    }
    var curVersion = chrome.extension.getVersion();
    if (ancVersion == null || curVersion != ancVersion) {
      localStorage["version"] = curVersion;
      if (pars.openupdate == 1) {
        chrome.tabs.create({
          "url" : "/release.html"
        });
        localStorage["versionViewRelease"] = localStorage["version"];
      }
      try {
        _gaq.push(['_trackEvent', 'Install', curVersion]);
        //pageTracker._trackEvent('Install', curVersion);
      } catch (e) {}
    }

    if (typeof betaversion != 'undefined') {
      chrome.browserAction.setTitle({
        title : "All Mangas Reader " + betaversion
      });
    } else {
      chrome.browserAction.setTitle({
        title : "All Mangas Reader " + curVersion
      });
    }

    //Log daily users
    var dailyStr = getDailyStr();
    var weeklyStr = getWeeklyStr();
    var monthlyStr = getMonthlyStr();
    if (localStorage["dailyStr"] == undefined || localStorage["dailyStr"] != dailyStr) {
      try {
        _gaq.push(['_trackEvent', 'Active', 'Day', dailyStr]);
        localStorage["dailyStr"] = dailyStr;
      } catch (e) {}
    }
    if (localStorage["weeklyStr"] == undefined || localStorage["weeklyStr"] != weeklyStr) {
      try {
        _gaq.push(['_trackEvent', 'Active', 'Week', weeklyStr]);
        localStorage["weeklyStr"] = weeklyStr;
      } catch (e) {}
    }
    if (localStorage["monthlyStr"] == undefined || localStorage["monthlyStr"] != monthlyStr) {
      try {
        _gaq.push(['_trackEvent', 'Active', 'Month', monthlyStr]);
        localStorage["monthlyStr"] = monthlyStr;
      } catch (e) {}
    }

    //console.log("Save current localSto ");
    saveList();

    if (pars.sync == 1) {
      console.log("synchronization started");
      sync.start();
    }

    //console.log("Refresh last chapters ");
    if (!localStorage["lastChaptersUpdate"]) {
      refreshAllLasts();
    } else {
      if (pars.checkmgstart == 1) {
        refreshAllLasts();
      } else {
        var nextTime = new Date().getTime() - localStorage["lastChaptersUpdate"] - pars.updatechap;
        if (nextTime > 0) {
          refreshAllLasts();
        } else {
          console.log("Next time to refresh chapters list : " + (-nextTime));
          timeoutChap = setTimeout(function () {
              refreshAllLasts();
            }, -nextTime);
        }
      }
    }

    if (!localStorage["lastMangasUpdate"]) {
      refreshMangaLists();
    } else {
      var nextTime = new Date().getTime() - localStorage["lastMangasUpdate"] - pars.updatemg;
      if (nextTime > 0) {
        refreshMangaLists();
      } else {
        console.log("Next time to refresh manga list : " + (-nextTime));
        timeoutMg = setTimeout(function () {
            refreshMangaLists();
          }, -nextTime);
        //Test if there is new mirrors
        refreshNewMirrorsMangaLists();
      }
    }

    if (!localStorage["lastWsUpdate"]) {
      refreshWebsites();
    } else {
      var nextTime = new Date().getTime() - localStorage["lastWsUpdate"] - updatews;
      if (nextTime > 0) {
        refreshWebsites();
      } else {
        console.log("Next time to refresh websites : " + (-nextTime));
        timeoutWs = setTimeout(function () {
            refreshWebsites();
          }, -nextTime);
      }
    }
  });
}

function getDailyStr() {
  var d = new Date();
  var m = d.getMonth() + 1;
  var mstr = "" + m;
  if (m < 10) {
    mstr = "0" + mstr;
  }
  var j = d.getDate();
  var jstr = "" + j;
  if (j < 10) {
    jstr = "0" + jstr;
  }
  return d.getFullYear() + "/" + mstr + "/" + jstr;
}
function getWeeklyStr() {
  var d = new Date();
  var w = d.getWeek();
  var wstr = "" + w;
  if (w < 10) {
    wstr = "0" + wstr;
  }
  return d.getFullYear() + "/" + wstr;
}
function getMonthlyStr() {
  var d = new Date();
  var m = d.getMonth() + 1;
  var mstr = "" + m;
  if (m < 10) {
    mstr = "0" + mstr;
  }
  return d.getFullYear() + "/" + mstr;
}

function formatMgName(name) {
  if (name == undefined || name == null || name == "null")
    return "";
  return name.trim().replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

function getSimilarMangaTitles(mg) {
  var res = [];
  var titMg = formatMgName(mg.name);
  for (var i = 0; i < mangaList.length; i++) {
    if (formatMgName(mangaList[i].name) == titMg) {
      res[res.length] = mangaList[i];
    }
  }
  return res;
}

function readManga(request, callback, doSave) {
  //console.log("READ MANGA : " + $H(request).toJSON());
  var mangaExist = isInMangaList(request.url);
  if (mangaExist == null) {
    //Add the new Manga
    var newManga = new MangaElt(request);
    //Search for similar manga names to mark read top
    var simMgs = getSimilarMangaTitles(newManga);
    if (simMgs.length > 0) {
      for (var i = 0; i < simMgs.length; i++) {
        if (simMgs[i].read == 1) {
          newManga.read = 1;
          break;
        }
        if (simMgs[i].update == 0) {
          newManga.update = 0;
          break;
        }
      }
    }
    //Add new manga
    mangaList[mangaList.length] = newManga;
    //Refresh chapters
    newManga.refreshLast();
    refreshUpdate();
    saveList();
    try {
      _gaq.push(['_trackEvent', 'AddManga', newManga.mirror, newManga.name]);
      //pageTracker._trackEvent('AddManga', newManga.name);
    } catch (e) {}
  } else {
    var ancLstChap = mangaExist.lastChapterReadURL;
    if (ancLstChap != undefined) {
      //Refresh manga item
      mangaExist.consult(request);
      if (doSave) {
        saveList();
      }
      if (mangaExist.lastChapterReadURL != ancLstChap) {
        refreshUpdate();
      }
      try {
        _gaq.push(['_trackEvent', 'ReadManga', request.mirror, request.name]);
        _gaq.push(['_trackEvent', 'ReadMangaChapter', request.name, request.lastChapterReadName]);
        //pageTracker._trackEvent('ReadManga', request.name, request.lastChapterReadName);
      } catch (e) {}
    }
  }

  callback();
}

function killManga(request, callback, doSave) {
  var mangaExist = isInMangaListId(request.url);
  if (mangaExist != -1) {
    var mirName = mangaList[mangaExist].mirror;
    var mgName = mangaList[mangaExist].name;
    mangaList.remove(mangaExist, mangaExist);
    if (doSave) {
      saveList();
      refreshUpdate();
    }
    try {
      _gaq.push(['_trackEvent', 'DeleteManga', mirName, mgName]);
      //pageTracker._trackEvent('DeleteManga', request.name);
    } catch (e) {}
  }

  callback();
}

function resetManga(request, callback, doSave) {
  var mangaExist = isInMangaList(request.url);
  if (mangaExist != null) {
    if (mangaExist.listChaps.length > 0) {
      mangaExist.lastChapterReadURL = mangaExist.listChaps[mangaExist.listChaps.length - 1][1];
      mangaExist.lastChapterReadName = mangaExist.listChaps[mangaExist.listChaps.length - 1][0];
      if (doSave) {
        saveList();
        refreshUpdate();
      }
      try {
        _gaq.push(['_trackEvent', 'ResetManga', mangaExist.mirror, mangaExist.name]);
        //pageTracker._trackEvent('DeleteManga', request.name);
      } catch (e) {}
    }
  }

  callback();
}

function markReadTop(request, callback, doSave) {
  var mangaExist = isInMangaList(request.url);
  if (mangaExist != null) {
    mangaExist.read = request.read;
    if (doSave) {
      saveList();
      refreshUpdate();
    }
    try {
      if (request.read == 1) {
        _gaq.push(['_trackEvent', 'SetReadState', mangaExist.mirror, mangaExist.name]);
      } else {
        _gaq.push(['_trackEvent', 'ReleaseReadState', mangaExist.mirror, mangaExist.name]);
      }
      //pageTracker._trackEvent('DeleteManga', request.name);
    } catch (e) {}
  }
  callback();
}

function markUpdateTop(request, callback, doSave) {
  var mangaExist = isInMangaList(request.url);
  if (mangaExist != null) {
    mangaExist.update = request.update;
    if (doSave) {
      saveList();
      refreshUpdate();
    }
    try {
      if (request.update == 1) {
        _gaq.push(['_trackEvent', 'SetUpdateState', mangaExist.mirror, mangaExist.name]);
      } else {
        _gaq.push(['_trackEvent', 'ReleaseUpdateState', mangaExist.mirror, mangaExist.name]);
      }
      //pageTracker._trackEvent('DeleteManga', request.name);
    } catch (e) {}
  }
  callback();
}

function addCategory(request, callback, doSave) {
  var mangaExist = isInMangaList(request.url);
  if (mangaExist != null) {
    var isFound = false;
    if (mangaExist.cats.length > 0) {
      for (var i = 0; i < mangaExist.cats.length; i++) {
        if (mangaExist.cats[i] == request.cat) {
          isFound = true;
          break;
        }
      }
    }
    if (!isFound) {
      mangaExist.cats[mangaExist.cats.length] = request.cat;
    }
    if (doSave) {
      saveList();
      refreshUpdate();
    }
  }
  callback();
}

function removeCatManga(request, callback, doSave) {
  var mangaExist = isInMangaList(request.url);
  if (mangaExist != null) {
    var isFound = -1;
    if (mangaExist.cats.length > 0) {
      for (var i = 0; i < mangaExist.cats.length; i++) {
        if (mangaExist.cats[i] == request.cat) {
          isFound = i;
          break;
        }
      }
    }
    if (isFound != -1) {
      mangaExist.cats.remove(isFound, isFound);
    }
    if (doSave) {
      saveList();
      refreshUpdate();
    }
  }
  callback();
}

function removeCategory(request, callback) {
  if (mangaList.length > 0) {
    for (var i = 0; i < mangaList.length; i++) {
      if (mangaList[i].cats.length > 0) {
        var toRem = [];
        for (var j = 0; j < mangaList[i].cats.length; j++) {
          if (mangaList[i].cats[j] == request.cat) {
            toRem[toRem.length] = j;
          }
        }
        for (var j = toRem.length - 1; j >= 0; j--) {
          mangaList[i].cats.remove(toRem[j], toRem[j]);
        }
      }
    }
  }
  saveList();
  refreshUpdate();

  callback();
}

function editCategory(request, callback) {
  if (mangaList.length > 0) {
    for (var i = 0; i < mangaList.length; i++) {
      if (mangaList[i].cats.length > 0) {
        var toRem = [];
        for (var j = 0; j < mangaList[i].cats.length; j++) {
          if (mangaList[i].cats[j] == request.cat) {
            mangaList[i].cats[j] = request.newcat;
          }
        }
      }
    }
  }
  saveList();
  refreshUpdate();

  callback();
}

chrome.extension.onRequest.addListener(
  function (request, sender, sendResponse) {
  if (request.action == "readManga") {
    readManga(request, function () {
      sendResponse({});
    }, true);
  }
  if (request.action == "readMangas") {
    $.each(request.list, function (index, val) {
      readManga(val, function () {}, false);
    });
    saveList();
    refreshUpdate();
    sendResponse({});
  }
  if (request.action == "killManga") {
    killManga(request, function () {
      sendResponse({});
    }, true);
  }
  if (request.action == "killMangas") {
    $.each(request.list, function (index, val) {
      killManga(val, function () {}, false);
    });
    saveList();
    refreshUpdate();
    sendResponse({});
  }
  if (request.action == "resetManga") {
    resetManga(request, function () {
      sendResponse({});
    }, true);
  }
  if (request.action == "resetMangas") {
    $.each(request.list, function (index, val) {
      resetManga(val, function () {}, false);
    });
    saveList();
    refreshUpdate();
    sendResponse({});
  }
  if (request.action == "setMangaChapter") {
    resetManga(request, function () {
      readManga(request, function () {
        sendResponse({});
      }, true);
    }, false);
  }
  if (request.action == "markReadTop") {
    markReadTop(request, function () {
      if (request.updatesamemangas) {
        //If group mode
        if (getParameters().groupmgs == 1) {
          //Look for mangas with same name...
          var mangaExist = isInMangaList(request.url);
          if (mangaExist != null) {
            var othMg = getSimilarMangaTitles(mangaExist);
            if (othMg.length > 0) {
              for (var i = 0; i < othMg.length; i++) {
                othMg.read = request.read;
              }
              saveList();
              refreshUpdate();
            }
          }
        }
        sendResponse({});
      } else {
        sendResponse({});
      }
    }, true);
  }
  if (request.action == "markReadTops") {
    $.each(request.list, function (index, val) {
      markReadTop(val, function () {}, false);
    });
    saveList();
    refreshUpdate();
    sendResponse({});
  }
  if (request.action == "markUpdateTop") {
    markUpdateTop(request, function () {
      if (request.updatesamemangas) {
        //If group mode
        if (getParameters().groupmgs == 1) {
          //Look for mangas with same name...
          var mangaExist = isInMangaList(request.url);
          if (mangaExist != null) {
            var othMg = getSimilarMangaTitles(mangaExist);
            if (othMg.length > 0) {
              for (var i = 0; i < othMg.length; i++) {
                othMg.update = request.update;
              }
              saveList();
              refreshUpdate();
            }
          }
        }
        sendResponse({});
      } else {
        sendResponse({});
      }
    }, true);
  }
  if (request.action == "markUpdateTops") {
    $.each(request.list, function (index, val) {
      markUpdateTop(val, function () {}, false);
    });
    saveList();
    refreshUpdate();
    sendResponse({});
  }
  if (request.action == "addCategory") {
    addCategory(request, function () {
      sendResponse({});
    }, true);
  }
  if (request.action == "addCategories") {
    $.each(request.list, function (index, val) {
      addCategory(val, function () {}, false);
    });
    saveList();
    refreshUpdate();
    sendResponse({});
  }
  if (request.action == "removeCategory") {
    removeCategory(request, function () {
      sendResponse({});
    });
  }
  if (request.action == "removeCatManga") {
    removeCatManga(request, function () {
      sendResponse({});
    }, true);
  }
  if (request.action == "removeCatMangas") {
    $.each(request.list, function (index, val) {
      removeCatManga(val, function () {}, false);
    });
    saveList();
    refreshUpdate();
    sendResponse({});
  }
  if (request.action == "editCategory") {
    editCategory(request, function () {
      sendResponse({});
    });
  }
  if (request.action == "mangaInfos") {
    var mangaExist = isInMangaList(request.url);
    if (mangaExist != null) {
      sendResponse({
        read : mangaExist.read,
        display : mangaExist.display
      });
    } else {
      sendResponse(null);
    }
  }
  if (request.action == "setDisplayMode") {
    var mangaExist = isInMangaList(request.url);
    if (mangaExist != null) {
      mangaExist.display = request.display;
      saveList();
      refreshUpdate();
      sendResponse({});
    } else {
      sendResponse({});
    }
  }
  if (request.action == "parameters") {
    sendResponse(getParameters());
  }
  if (request.action == "saveparameters") {
    var obj = {};
    obj.displayAdds = request.displayAdds;
    obj.displayChapters = request.displayChapters;
    obj.displayMode = request.displayMode;
    obj.popupMode = request.popupMode;
    obj.omSite = request.omSite;
    obj.newTab = request.newTab;
    obj.sync = request.sync;
    obj.displayzero = request.displayzero;
    obj.pub = request.pub;
    obj.dev = request.dev;
    obj.load = request.load;
    obj.resize = request.resize;
    obj.color = request.color;
    obj.imgorder = request.imgorder;
    obj.groupmgs = request.groupmgs;
    obj.openupdate = request.openupdate;
    obj.updatechap = request.updatechap;
    obj.updatemg = request.updatemg;
    obj.newbar = request.newbar;
    obj.addauto = request.addauto;
    obj.lrkeys = request.lrkeys;
    obj.size = request.size;
    obj.autobm = request.autobm;
    obj.prefetch = request.prefetch;
    obj.shownotifications = request.shownotifications;
    obj.notificationtimer = request.notificationtimer;
    obj.rightnext = request.rightnext;
    obj.refreshspin = request.refreshspin;
    obj.savebandwidth = request.savebandwidth;
    obj.checkmgstart = request.checkmgstart;
    obj.nocount = request.nocount;
    obj.displastup = request.displastup;
    obj.markwhendownload = request.markwhendownload;
    obj.sendstats = request.sendstats;
    obj.shownotifws = request.shownotifws;

    var ancParams = getParameters();
    obj.updated = ancParams.updated;
    obj.syncAMR = ancParams.syncAMR;
    // start sync or stop sync if different
    if (ancParams.sync != obj.sync) {
      if (obj.sync == 1) {
        console.log("synchronization started (parameter update)");
        sync.start();
        try {
          _gaq.push(['_trackEvent', 'Sync', 'activate']);
          //pageTracker._trackEvent('DeleteManga', request.name);
        } catch (e) {}
      } else {
        console.log("synchronization stopped (parameter update)");
        sync.stop();
        try {
          _gaq.push(['_trackEvent', 'Sync', 'desactivate']);
          //pageTracker._trackEvent('DeleteManga', request.name);
        } catch (e) {}
      }
    }
    // localStorage["parameters"] = $H(obj).toJSON(); --> remove prototype usage
    localStorage["parameters"] = JSON.stringify(obj);
    if (ancParams.displayzero != obj.displayzero) {
      refreshTag();
    }
    if (ancParams.nocount != obj.nocount) {
      drawIcon(false);
      refreshTag();
    }
    if (ancParams.groupmgs != obj.groupmgs) {
      refreshTag();
    }
    if (ancParams.updatechap != obj.updatechap) {
      refreshAllLasts(true, false);
    }
    if (ancParams.updatemg != obj.updatemg) {
      refreshMangaLists(true, false);
    }
    sendResponse({});
  }
  if (request.action == "opentab") {
    chrome.tabs.create({
      "url" : request.url
    });
    sendResponse({});
  }
  if (request.action == "openExtensionMainPage") {
    //TO_CHANGE
    chrome.tabs.create({
      "url" : "http://www.allmangasreader.com/"
    });
    try {
      //_gaq.push(['_trackEvent', 'ClickPub', 'OneMangaBanner']);
      //pageTracker._trackEvent('ClickPub', 'OneMangaBanner');
    } catch (e) {}
    sendResponse({});
  }
  if (request.action == "save") {
    saveList();
    sendResponse({});
  }
  if (request.action == "mirrors") {
    getFilledMirrorsDesc(activatedMirrors(), function (mirrorsDesc) {
      sendResponse(mirrorsDesc);
    });
  }
  if (request.action == "actmirrors") {
    getActivatedMirrorsWithList({
      list : activatedMirrors()
    }, function (mirrorsDesc) {
      // getActivatedMirrorsWithList fills listmgs for each mirror
      /*for (var i = 0; i < mirrorsDesc.length; i++) {
      if (mirrorsDesc[i].canListFullMangas) {
      mirrorsDesc[i].listmgs = localStorage[mirrorsDesc[i].mirrorName];
      }
      }*/
      sendResponse(mirrorsDesc);
    });
  }
  if (request.action == "searchManga") {
    if (getMangaMirror(request.mirrorName) != null) {
      getMangaMirror(request.mirrorName).getMangaList(request.search, function (mirror, lst) {
        request.list = lst;
        sendResponse(request);
      });
    } else {
      request.list = [];
      sendResponse(request);
    }
  }
  if (request.action == "searchMirrorsState") {
    sendResponse({
      res : localStorage["searchMirrorsState"]
    });
  }
  if (request.action == "pagematchurls") {
    doesCurrentPageMatchManga(request.url, activatedMirrors(), function (_isOk, _mirrorName, _implementationURL) {
      //Load remote script implementation corresponding to current website
      var docache = true;
      if (_implementationURL !== null && _implementationURL.indexOf(".php") != -1) {
        docache = false;
      }
      $.loadScript(_implementationURL, docache, function (sScriptBody, textStatus, jsXHR) {
        //Execute it in the concerned tab context
        chrome.tabs.executeScript(sender.tab.id, {
          code : sScriptBody
        }, function () {
          //Return to content script...
          sendResponse({
            isOk : _isOk,
            mirrorName : _mirrorName,
            implURL : _implementationURL
          });
        });
      }, function() {
        // error managing 
        console.log("Script " + _mirrorName + " failed to be loaded in page...");
        sendResponse({
            isOk : false
          });
      }, 'text');
    });
  }
  if (request.action == "deletepub") {
    var params = getParameters();
    params.pub = 0;
    //localStorage["parameters"] = $H(params).toJSON(); --> remove prototype usage
    localStorage["parameters"] = JSON.stringify(params);
    sendResponse({});
  }
  if (request.action == "getListManga") {
    wssql.webdb.getMangaList(request.mirror, function (list) {
      var mangas = list;
      if (mangas != undefined && mangas != null && mangas.length > 0) {
        sendResponse(mangas);
      } else {
        if (getMangaMirror(request.mirror) != null) {
          getMangaMirror(request.mirror).getMangaList("", function (name, lst) {
            sendResponse(lst);
          });
        } else {
          sendResponse([]);
        }
      }
    });
  }
  if (request.action == "getListChap") {
    var mangaExist = isInMangaList(request.url);
    if (mangaExist == null) {
      if (getMangaMirror(request.mirror) != null) {
        getMangaMirror(request.mirror).getListChaps(request.mangaUrl, request.mangaName, null, function (lst, obj) {
          sendResponse(lst);
        });
      } else {
        sendResponse([]);
      }
    } else {
      sendResponse(mangaExist.listChaps);
    }
  }
  if (request.action == "nbMangaInMirror") {
    var nb = 0;
    for (var i = 0; i < mangaList.length; i++) {
      if (mangaList[i].mirror == request.mirror) {
        nb++;
      }
    }
    sendResponse({
      number : nb,
      mirror : request.mirror
    });
  }
  if (request.action == "activateMirror") {
    activateMirror(request.mirror);
    try {
      _gaq.push(['_trackEvent', 'ActivateMirror', request.mirror]);
    } catch (e) {}
    sendResponse({});
  }
  if (request.action == "desactivateMirror") {
    desactivateMirror(request.mirror);
    try {
      _gaq.push(['_trackEvent', 'DesactivateMirror', request.mirror]);
    } catch (e) {}
    sendResponse({});
  }
  if (request.action == "isMirrorActivated") {
    sendResponse({
      mirror : request.mirror,
      activated : isMirrorActivated(request.mirror)
    });
  }
  if (request.action == "activatedMirrors") {
    var lst = activatedMirrors();
    sendResponse({
      list : lst
    });
  }
  if (request.action == "addUpdateBookmark") {
    addBookmark(request);
    sendResponse({});
  }
  if (request.action == "deleteBookmark") {
    deleteBookmark(request);
    sendResponse({});
  }
  if (request.action == "getBookmarkNote") {
    var noteBM = getBookmark(request);
    sendResponse({
      isBooked : noteBM.booked,
      note : noteBM.note,
      scanSrc : noteBM.scanSrc
    });
  }
  if (request.action == "createContextMenu") {
    var isFound = false;
    if (ctxIds.length > 0) {
      for (var i = 0; i < ctxIds.length; i++) {
        if (ctxIds[i] == request.lstUrls[0]) {
          isFound = true;
          break;
        }
      }
    }
    if (!isFound) {
      ctxIds[ctxIds.length] = request.lstUrls[0];
      var id = chrome.contextMenus.create({
          title : "Bookmark in AMR",
          contexts : ["image"],
          onclick : function (info, tab) {
            chrome.tabs.executeScript(tab.id, {
              code : "clickOnBM(\"" + info.srcUrl + "\")"
            }, function () {});
          },
          targetUrlPatterns : [encodeURI(request.lstUrls[0]), request.lstUrls[0]]
        }, function () {
          //console.log("Id : " + id + "; url : " + request.lstUrls[0]);
          sendResponse({});
        });
    } else {
      sendResponse({});
    }
  }
  if (request.action == "importMangas") {
    sendResponse({
      out : importMangas(request.mangas, request.merge)
    });
  }
  if (request.action == "importBookmarks") {
    sendResponse({
      out : importBookmarks(request.bookmarks, request.merge)
    });
  }
  if (request.action == "hideBar") {
    if (localStorage["isBarVisible"] == 1) {
      localStorage["isBarVisible"] = 0;
    } else {
      localStorage["isBarVisible"] = 1;
    }
    sendResponse({
      res : localStorage["isBarVisible"]
    });
  }
  if (request.action == "showBar") {
    localStorage["isBarVisible"] = 1;
    sendResponse({});
  }
  if (request.action == "barState") {
    if (localStorage["isBarVisible"] == undefined) {
      sendResponse({
        barVis : 1
      });
    } else {
      sendResponse({
        barVis : localStorage["isBarVisible"]
      });
    }
  }
  if (request.action == "getNextChapterImages") {
    $.ajax({
      url : request.url,

      success : function (data) {
        var div = document.createElement("iframe");
        div.style.display = "none";
        var id = "mangaNextChap";
        var i = 0;
        while ($("#" + id + i).size() > 0) {
          i++;
        }
        id = id + i;
        $(div).attr("id", id);
        document.body.appendChild(div);
        document.getElementById(id).contentWindow.document.documentElement.innerHTML = data;
        $(document.getElementById(id).contentWindow.document).ready(function () {
          //Get images urls
          var imagesUrl = getMangaMirror(request.mirrorName).getListImages(document.getElementById(id).contentWindow.document, request.url);
          sendResponse({
            images : imagesUrl
          });
          $("#" + id).remove();
        });
      },
      error : function () {
        sendResponse({
          images : null
        });
      }
    });
  }
  if (request.action == "mangaList") {
    sendResponse({
      lst : mangaList,
      ts : ((getParameters().syncAMR) ? getParameters().syncAMR : 0),
      haschange : (getParameters().changesSinceSync == 1)
    });
  }
  if (request.action == "updateFromSite") {
    //Import new or updated mangas
    updateFromSite(request.lst, true);
    refreshUpdateSyncSite(request.ts);
    sendResponse({});
  }
  if (request.action == "replaceFromSite") {
    //Erase manga list
    updateFromSite(request.lst, false);
    refreshUpdateSyncSite(request.ts);
    sendResponse({});
  }
  if (request.action == "siteUpdated") {
    refreshUpdateSyncSite(request.ts);
    sendResponse({});
  }
  if (request.action == "readMgForStat") {
    pstat.webdb.addStat(request, function (ltId) {
      sendResponse({
        id : ltId
      });
    });
  }
  if (request.action == "updateMgForStat") {
    pstat.webdb.updateStat(request.id, request.time_spent, function () {
      sendResponse({});
    });
  }
  if (request.action == "updateMirrors") {
    updateMirrors(function (resp) {
      sendResponse(resp);
    });
  }
  if (request.action == "importimplementation") {
    importImplentationFromId(request.id, function (mirrorName) {
      updateMirrors(function () {
        sendResponse({
          mirror : mirrorName
        });
      });
    });
  }
  if (request.action == "releaseimplementation") {
    releaseImplentationFromId(request.id, function (mirrorName) {
      updateMirrors(function () {
        sendResponse({
          mirror : mirrorName
        });
      });
    });
  }

  /*
  if (request.action == "createZipFile") {
  ZipGen.createZipFile(request, function(cont) {
  sendResponse({content: cont});
  });
  }*/
});

/*
HTMLImageElement.prototype.zipGen = null;

var ZipGen = {
cmpt: 0,
zip: null,
callbac: null,

createZipFile: function(request, callback) {
this.callbac = callback;

if (!document.getElementById('canvas')) {
var ctxObj = document.createElement('canvas');
ctxObj.setAttribute("id", "canvas");
ctxObj.setAttribute("width", "1000px");
ctxObj.setAttribute("height", "1000px");
document.body.appendChild(ctxObj);
}

this.cmpt = 1;//request.lst.length;
this.zip = new JSZip("DEFLATE");

for (var i = 0; i < 1; i++) { //request.lst.length
var img = new Image();
img.zipGen = this;
img.onload = function() {
console.log("image loaded" + this.getAttribute("dataNumber"));
var ctx = document.getElementById('canvas').getContext('2d');
ctx.drawImage(this, 0, 0);
var dataurl = document.getElementById('canvas').toDataURL("image/png", "");
//console.log(this.getAttribute("dataNumber") + " --> " + dataurl);
this.zipGen.zip.add("scan" + this.getAttribute("dataNumber") + ".png", dataurl, {base64: true});
this.zipGen.cmpt--;
}
img.onerror = function(){
console.log("image error");
this.zipGen.cmpt--;
}
img.setAttribute("dataNumber", i);
console.log(i + " --> " + request.lst[i]);
img.src = request.lst[i];
}
this.waitForLoaded();
},
waitForLoaded: function() {
if (this.cmpt == 0) {
console.log("sending...");
var content = this.zip.generate(true);
this.callbac(content);
} else {
console.log("waiting...");
var _th = this;
setTimeout(function() {
_th.waitForLoaded();
}, 100);
}
}
}
 */
function updateMirrors(_callback) {
  getMirrors(function (mirrorsT) {
    mirrors = mirrorsT;

    initMirrorState();

    actMirrors = [];
    for (var i = 0; i < mirrors.length; i++) {
      if (isMirrorActivated(mirrors[i].mirrorName)) {
        actMirrors[actMirrors.length] = mirrors[i];
      }
    }
    //Test if there is new mirrors
    refreshNewMirrorsMangaLists();
    _callback();
  });
}
//bookmark : obj {mirror, url, chapUrl, type(chapter, scan), name, chapName, scanUrl, scanName, note}
function getBookmark(obj) {
  if (bookmarks.length > 0) {
    for (var j = 0; j < bookmarks.length; j++) {
      if (obj.mirror == bookmarks[j].mirror
         && obj.url == bookmarks[j].url
         && obj.chapUrl == bookmarks[j].chapUrl
         && obj.type == bookmarks[j].type) {
        if (obj.type == "chapter") {
          //console.log("chapter booked get");
          return {
            booked : true,
            note : bookmarks[j].note
          };
        } else {
          if (obj.scanUrl == bookmarks[j].scanUrl || encodeURI(obj.scanUrl) == bookmarks[j].scanUrl) {
            //console.log({booked: true, note: lstTmp[j].note, scanSrc: obj.scanUrl});
            return {
              booked : true,
              note : bookmarks[j].note,
              scanSrc : obj.scanUrl
            };
          }
        }
      }
    }
  }
  return {
    booked : false,
    note : ""
  };
}

function addBookmark(obj) {
  var isFound = false;
  var posFound;
  if (bookmarks.length > 0) {
    for (var j = 0; j < bookmarks.length; j++) {
      if (obj.mirror == bookmarks[j].mirror
         && obj.url == bookmarks[j].url
         && obj.chapUrl == bookmarks[j].chapUrl
         && obj.type == bookmarks[j].type) {
        if (obj.type == "chapter") {
          isFound = true;
          posFound = j;
          break;
        } else {
          if (obj.scanUrl == bookmarks[j].scanUrl) {
            isFound = true;
            posFound = j;
            break;
          }
        }
      }
    }
  }
  if (!isFound) {
    bookmarks[bookmarks.length] = {
      mirror : obj.mirror,
      url : obj.url,
      chapUrl : obj.chapUrl,
      type : obj.type,
      name : obj.name,
      chapName : obj.chapName,
      scanUrl : obj.scanUrl,
      scanName : obj.scanName,
      note : obj.note
    };
  } else {
    bookmarks[posFound].note = obj.note;
  }
  //localStorage["bookmarks"] = $A(bookmarks).toJSON(); --> remove prototype usage
  localStorage["bookmarks"] = JSON.stringify(bookmarks);
}

function deleteBookmark(obj) {
  var isFound = false;
  var posFound;
  if (bookmarks.length > 0) {
    for (var j = 0; j < bookmarks.length; j++) {
      if (obj.mirror == bookmarks[j].mirror
         && obj.url == bookmarks[j].url
         && obj.chapUrl == bookmarks[j].chapUrl
         && obj.type == bookmarks[j].type) {
        if (obj.type == "chapter") {
          isFound = true;
          posFound = j;
          break;
        } else {
          if (obj.scanUrl == bookmarks[j].scanUrl) {
            isFound = true;
            posFound = j;
            break;
          }
        }
      }
    }
  }
  if (isFound) {
    bookmarks.remove(posFound, posFound);
    //localStorage["bookmarks"] = $A(bookmarks).toJSON(); --> remove prototype usage
    localStorage["bookmarks"] = JSON.stringify(bookmarks);
  }
}

function activateMirror(mirrorName) {
  var states = localStorage["mirrorStates"];
  // Here we are using eval (***)
  //var lstTmp = $A(eval('(' + states + ')')); --> remove eval function
  var lstTmp = JSON.parse(states);
  if (lstTmp.length > 0) {
    for (var j = 0; j < lstTmp.length; j++) {
      if (lstTmp[j].mirror == mirrorName) {
        lstTmp[j] = {
          mirror : mirrorName,
          activated : true
        };
        //localStorage["mirrorStates"] = $A(lstTmp).toJSON(); --> remove prototype usage
        localStorage["mirrorStates"] = JSON.stringify(lstTmp);
        
        // Load refreshMirror
        try {
          for (var i = 0; i < mirrors.length; i++) {
            if (mirrors[i].mirrorName == mirrorName) {
              actMirrors[actMirrors.length] = mirrors[i];
              if (mirrors[i].canListFullMangas) {
                mirrors[i].getMangaList("", mangaListLoaded);
              }
            }
          }
        } catch (e) {
          //
        }
        break;
      }
    }
  }
}

function desactivateMirror(mirrorName) {
  var nb = 0;
  for (var i = 0; i < mangaList.length; i++) {
    if (mangaList[i].mirror == mirrorName) {
      nb++;
    }
  }
  if (nb == 0) {
    var states = localStorage["mirrorStates"];
    // Here we are using eval (***)
    //var lstTmp = $A(eval('(' + states + ')')); --> remove eval function
    var lstTmp = JSON.parse(states);
    if (lstTmp.length > 0) {
      for (var j = 0; j < lstTmp.length; j++) {
        if (lstTmp[j].mirror == mirrorName) {
          lstTmp[j] = {
            mirror : mirrorName,
            activated : false
          };
          //localStorage["mirrorStates"] = $A(lstTmp).toJSON(); --> remove prototype usage
          localStorage["mirrorStates"] = JSON.stringify(lstTmp);
          
          // Delete from localStorage
          wssql.webdb.empty(mirrorName, function () {});
          //localStorage[mirrorName] = null;
          break;
        }
      }
    }
    var toRemove = -1;
    for (var j = 0; j < actMirrors.length; j++) {
      if (actMirrors[j].mirrorName == mirrorName) {
        toRemove = j;
      }
    }
    if (toRemove != -1) {
      actMirrors.remove(toRemove, toRemove);
    }
  }
}

function initMirrorState() {
  var states = localStorage["mirrorStates"];
  if (states == undefined || states == null || states == "null") {
    instantiateMirrors();
  } else {
    // Here we are using eval (***)
    //var lstTmp = $A(eval('(' + states + ')')); --> Remove eval function
    var lstTmp = JSON.parse(states);
    if (lstTmp.length > 0) {
      var toUpdate = false;
      for (var i = 0; i < mirrors.length; i++) {
        //console.log("SEARCH : " + mirrors[i].mirrorName);
        var isFound = false;
        for (var j = 0; j < lstTmp.length; j++) {
          //console.log(lstTmp[j].mirror + " --> " + mirrors[i].mirrorName);
          if (lstTmp[j].mirror == mirrors[i].mirrorName) {
            isFound = true;
            break;
          }
        }
        if (!isFound) {
          //console.log("NOT FOUND : " + mirrors[i].mirrorName);
          lstTmp[lstTmp.length] = {
            mirror : mirrors[i].mirrorName,
            activated : true
          };
          toUpdate = true;
        }
      }
      if (toUpdate) {
        //localStorage["mirrorStates"] = $A(lstTmp).toJSON(); --> remove prototype usage
        localStorage["mirrorStates"] = JSON.stringify(lstTmp);
      }
    } else {
      instantiateMirrors();
    }
  }
}

function instantiateMirrors() {
  var lst = new Array();
  for (var i = 0; i < mirrors.length; i++) {
    lst[lst.length] = {
      mirror : mirrors[i].mirrorName,
      activated : true
    };
  }
  // localStorage["mirrorStates"] = $A(lst).toJSON(); --> remove prototype usage
  localStorage["mirrorStates"] = JSON.stringify(lst);
}

function isMirrorActivated(mirrorName) {
  var states = localStorage["mirrorStates"];
  // Here we are using eval (***)
  //var lstTmp = $A(eval('(' + states + ')')); --> remove eval function
  var lstTmp = JSON.parse(states);
  if (lstTmp.length > 0) {
    for (var j = 0; j < lstTmp.length; j++) {
      if (lstTmp[j].mirror == mirrorName) {
        return lstTmp[j].activated;
      }
    }
  }
  return false;
}

function hasDesactivatedOnce() {
  var states = localStorage["mirrorStates"];
  // Here we are using eval (***)
  //var lstTmp = $A(eval('(' + states + ')')); --> remove eval function
  var lstTmp = JSON.parse(states);
  var nbActi = 0;
  if (lstTmp.length > 0) {
    for (var j = 0; j < lstTmp.length; j++) {
      if (lstTmp[j].activated) {
        nbActi++;
      }
    }
  }
  return (nbActi <= 25);
}

function activatedMirrors() {
  var list = new Array();
  var states = localStorage["mirrorStates"];
  // Here we are using eval (***)
  //var lstTmp = $A(eval('(' + states + ')')); --> remove eval function
  var lstTmp = JSON.parse(states);
  if (lstTmp.length > 0) {
    for (var j = 0; j < lstTmp.length; j++) {
      if (lstTmp[j].activated == true) {
        list[list.length] = lstTmp[j];
      }
    }
  }
  return list;
}

function initParam(object, paramName, defaultVal) {
  if (object[paramName] == undefined || object[paramName] == null || object[paramName] == "null") {
    object[paramName] = defaultVal;
  }
}

function getParameters() {
  var params = localStorage["parameters"];
  var res;
  if (params == undefined || params == null || params == "null") {
    res = defaultParams();
    //localStorage["parameters"] = $H(res).toJSON(); --> remove prototype usage
    localStorage["parameters"] = JSON.stringify(res);
  } else {
    // Here we are using eval (***)
    // res = eval('(' + params + ')'); --> remove eval function
    res = JSON.parse(params);
    initParam(res, "omSite", 0);
    initParam(res, "newTab", 0);
    initParam(res, "sync", 0);
    initParam(res, "displayzero", 1);
    initParam(res, "pub", 1);
    initParam(res, "dev", 0);
    initParam(res, "load", 0);
    initParam(res, "resize", 1);
    initParam(res, "color", 0);
    initParam(res, "imgorder", 0);
    initParam(res, "groupmgs", 1);
    initParam(res, "openupdate", 0);
    initParam(res, "updatechap", 6 * 60 * 60000);
    initParam(res, "updatemg", 24 * 60 * 60000);
    initParam(res, "newbar", 1);
    initParam(res, "addauto", 1);
    initParam(res, "lrkeys", 1);
    initParam(res, "size", 1);
    initParam(res, "autobm", 1);
    initParam(res, "prefetch", 1);
    initParam(res, "shownotifications", 1);
    initParam(res, "notificationtimer", 0);
    initParam(res, "rightnext", 1);
    initParam(res, "refreshspin", 1);
    initParam(res, "savebandwidth", 0);
    initParam(res, "checkmgstart", 0);
    initParam(res, "nocount", 0);
    initParam(res, "displastup", 1);
    initParam(res, "markwhendownload", 0);
    initParam(res, "sendstats", 1);
    initParam(res, "shownotifws", 1);

    //localStorage["parameters"] = $H(res).toJSON(); --> remove prototype usage
    localStorage["parameters"] = JSON.stringify(res);
  }
  return res;
}

function defaultParams() {
  var obj = {};
  obj.displayAdds = 0;
  obj.displayChapters = 1;
  obj.displayMode = 1;
  obj.popupMode = 1;
  obj.omSite = 0;
  obj.newTab = 0;
  obj.sync = 0;
  obj.displayzero = 1;
  obj.pub = 1;
  obj.dev = 0;
  obj.load = 0;
  obj.resize = 1;
  obj.color = 0;
  obj.imgorder = 0;
  obj.groupmgs = 1;
  obj.openupdate = 0;
  obj.updatechap = 30 * 60000;
  obj.updatemg = 24 * 60 * 60000;
  obj.newbar = 1;
  obj.addauto = 1;
  obj.lrkeys = 1;
  obj.size = 1;
  obj.autobm = 1;
  obj.prefetch = 1;
  obj.shownotifications = 1;
  obj.notificationtimer = 0;
  obj.rightnext = 1;
  obj.refreshspin = 1;
  obj.savebandwidth = 0;
  obj.checkmgstart = 0;
  obj.nocount = 0;
  obj.displastup = 1;
  obj.markwhendownload = 0;
  obj.sendstats = 1;
  obj.shownotifws = 1;

  return obj;
}

/* Return the existing manga in the follow list that match with the request */
function isInMangaList(url) {
  for (var i = 0; i < mangaList.length; i++) {
    if (mangaList[i].url == url) {
      return mangaList[i];
    }
  }
  return null;
}

function isInMangaListId(url) {
  for (var i = 0; i < mangaList.length; i++) {
    if (mangaList[i].url == url) {
      return i;
    }
  }
  return -1;
}

var canvas;
var canvasContext;
var animationFrames = 20;
var animationSpeed = 30;
var rotation = 0;
var sharinganImage;

function ease(x) {
  return (1 - Math.sin(Math.PI / 2 + x * Math.PI)) / 2;
}

function grayscale(cnv, w, h) {
  var imageData = cnv.getImageData(0, 0, w, h);

  for (var j = 0; j < imageData.height; j++) {
    for (var i = 0; i < imageData.width; i++) {
      var index = (i * 4) * imageData.width + (j * 4);
      var average = (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3 + 75;
      if (average > 255)
        average = 255;
      imageData.data[index] = average;
      imageData.data[index + 1] = average;
      imageData.data[index + 2] = average;
    }
  }
  cnv.putImageData(imageData, 0, 0, 0, 0, imageData.width, imageData.height);
}
function drawIcon(isgrey) {
  if (canvas == undefined) {
    canvas = document.getElementById('canvas');
    sharinganImage = document.getElementById('sharingan');
    canvasContext = canvas.getContext('2d');
  }
  //console.log("drawIcon " + isgrey);
  canvasContext.save();
  canvasContext.clearRect(0, 0, canvas.width, canvas.height);
  canvasContext.translate(
    canvas.width / 2,
    canvas.height / 2);
  canvasContext.drawImage(sharinganImage,
    -canvas.width / 2,
    -canvas.height / 2);
  if (isgrey) {
    //console.log("Grey !");
    grayscale(canvasContext, canvas.width, canvas.height);
  }
  canvasContext.restore();
  //console.log("set it");
  chrome.browserAction.setIcon({
    imageData : canvasContext.getImageData(0, 0,
      canvas.width, canvas.height)
  });
  //console.log("done");
}
function drawIconAtRotation(doEase) {
  if (doEase == undefined) {
    doEase = false;
  }
  canvasContext.save();
  canvasContext.clearRect(0, 0, canvas.width, canvas.height);
  canvasContext.translate(
    canvas.width / 2,
    canvas.height / 2);
  canvasContext.rotate(2 * Math.PI * (doEase ? ease(rotation) : rotation));
  canvasContext.drawImage(sharinganImage,
    -canvas.width / 2,
    -canvas.height / 2);
  if (getParameters().nocount == 1 && !hasNew()) {
    grayscale(canvasContext, canvas.width, canvas.height);
  }
  canvasContext.restore();

  chrome.browserAction.setIcon({
    imageData : canvasContext.getImageData(0, 0,
      canvas.width, canvas.height)
  });
}

function WaitForAllLists(_sizeAll, _onFinish, _doSpin) {
  this.nbMade = 0;
  this.sizeAll = _sizeAll;
  this.onFinish = _onFinish;
  this.doSpin = _doSpin;
  this.hasStart = false;
  this.doEase = true;
}
WaitForAllLists.prototype.incMade = function () {
  this.nbMade++;
};
WaitForAllLists.prototype.wait = function () {
  if (!this.hasStart) {
    //First call
    if (this.doSpin) {
      canvas = document.getElementById('canvas');
      sharinganImage = document.getElementById('sharingan');
      canvasContext = canvas.getContext('2d');
    }
    this.hasStart = true;
  }
  if (this.sizeAll <= this.nbMade) {
    //Finished
    if (this.doSpin) {
      rotation += 1 / animationFrames;
      if (rotation > 1) {
        rotation = 0;
        drawIconAtRotation(true);
        //console.log("Finished loading list... the sharingan may have stopped spinning... nbMade : " + this.nbMade + " ; sizeAll : " + this.sizeAll);
        this.onFinish();
      } else {
        drawIconAtRotation();
        var _self = this;
        setTimeout(function () {
          _self.wait();
        }, animationSpeed);
      }
    } else {
      this.onFinish();
    }
  } else {
    if (this.doSpin) {
      rotation += 1 / animationFrames;
      if (rotation > 1) {
        rotation = rotation - 1;
        this.doEase = false;
      }
      drawIconAtRotation(this.doEase);
    }
    var _self = this;
    setTimeout(function () {
      _self.wait();
    }, animationSpeed);
  }
};

//savebandwidth
function refreshManga(mg, waiter, pos) {
  if (getMangaMirror(mg.mirror) == null)
    return;
  if (getParameters().savebandwidth == 1 || (getMangaMirror(mg.mirror).savebandwidth != undefined && getMangaMirror(mg.mirror).savebandwidth)) {
    if (waiter.nbMade == pos) {
      //console.log("Savebandwidth mode --> call refresh for " + mg.url + " pos " + pos);
      mg.refreshLast(false, function (obj) {
        //console.log("Finish nbMade : " + waiter.nbMade + " ; sizeAll : " + waiter.sizeAll + " for " + obj.url);
        waiter.incMade();
      });
    } else {
      //console.log("Savebandwidth mode --> wait for refresh " + pos);
      setTimeout(function () {
        refreshManga(mg, waiter, pos);
      }, 100);
    }
  } else {
    //console.log("NOT Savebandwidth mode --> load refresh " + pos);
    //console.log("Call refresh for " + mg.url + " pos " + pos);
    mg.refreshLast(false, function (obj) {
      //console.log("Finish nbMade : " + waiter.nbMade + " ; sizeAll : " + waiter.sizeAll + " for " + obj.url);
      waiter.incMade();
    });
  }
}

//If refreshTimer is true, the frequency have change, recalculate frequency and set new Timeout for timeoutChap
//If perform is true, update list now and set new timeout
//change option : refreshAllLasts(true, false);
//refresh now : refreshAllLasts(true, true);
//normal : refreshAllLasts();
function refreshAllLasts(refreshTimer, perform) {
  try {
    if (perform == undefined || perform == true) {
      console.log("Refreshing chapters at " + new Date());
      localStorage["lastChaptersUpdate"] = new Date().getTime();
      var nbToRef = 0;
      for (var i = 0; i < mangaList.length; i++) {
        if (getMangaMirror(mangaList[i].mirror) != null)
          nbToRef++
      }
      var waiter = new WaitForAllLists(nbToRef, function () {
          saveList();
        }, getParameters().refreshspin);

      var pos = 0;
      // Not forced bandwidth safe first
      for (var i = 0; i < mangaList.length; i++) {
        if (getMangaMirror(mangaList[i].mirror) != null) {
          if (getMangaMirror(mangaList[i].mirror).savebandwidth == undefined || !getMangaMirror(mangaList[i].mirror).savebandwidth) {
            //console.log("Launch refresh for " + mangaList[i].url + " pos " + pos);
            refreshManga(mangaList[i], waiter, pos);
            pos++;
          }
        }
      }
      // Forced bandwidth safe
      for (var i = 0; i < mangaList.length; i++) {
        if (getMangaMirror(mangaList[i].mirror) != null) {
          if (getMangaMirror(mangaList[i].mirror).savebandwidth != undefined && getMangaMirror(mangaList[i].mirror).savebandwidth) {
            //console.log("Launch refresh for " + mangaList[i].url + " pos " + pos);
            refreshManga(mangaList[i], waiter, pos);
            pos++;
          }
        }
      }
      waiter.wait();
    }
  } catch (e) {
    //
  }
  var nextTime = getParameters().updatechap;
  if (refreshTimer) {
    clearTimeout(timeoutChap);
    //Change nextTime calcultate it...
    nextTime =  - (new Date().getTime() - localStorage["lastChaptersUpdate"] - nextTime);
  }
  console.log("Next time to refresh chapters list : " + nextTime);
  timeoutChap = setTimeout(function () {
      refreshAllLasts();
    }, nextTime);
}

//If refreshTimer is true, the frequency have change, recalculate frequency and set new Timeout for timeoutMg
//If perform is true, update list now and set new timeout
//change option : refreshMangaLists(true, false);
//refresh now : refreshMangaLists(true, true);
//normal : refreshMangaLists();
function refreshMangaLists(refreshTimer, perform) {
  try {
    if (perform == undefined || perform == true) {
      console.log("Refreshing mangas lists at " + new Date());
      localStorage["lastMangasUpdate"] = new Date().getTime();
      for (var i = 0; i < mirrors.length; i++) {
        if (mirrors[i].canListFullMangas && isMirrorActivated(mirrors[i].mirrorName)) {
          mirrors[i].getMangaList("", mangaListLoaded);
        }
      }
    }
  } catch (e) {
    //
  }
  var nextTime = getParameters().updatemg;
  if (refreshTimer) {
    clearTimeout(timeoutMg);
    //Change nextTime calcultate it...
    nextTime =  - (new Date().getTime() - localStorage["lastMangasUpdate"] - nextTime);
  }
  console.log("Next time to refresh manga list : " + nextTime);
  timeoutMg = setTimeout(function () {
      refreshMangaLists();
    }, nextTime);
}

function refreshWebsites(refreshTimer, perform) {
  try {
    if (perform == undefined || perform == true) {
      console.log("Refreshing websites implementations at " + new Date());
      localStorage["lastWsUpdate"] = new Date().getTime();
      updateWebsitesFromRepository(function () {
        updateMirrors(function () {});
      });
    }
  } catch (e) {
    //
  }
  var nextTime = updatews;
  if (refreshTimer) {
    clearTimeout(timeoutWs);
    //Change nextTime calcultate it...
    nextTime =  - (new Date().getTime() - localStorage["lastWsUpdate"] - nextTime);
  }
  console.log("Next time to refresh websites implementations : " + nextTime);
  timeoutWs = setTimeout(function () {
      refreshWebsites();
    }, nextTime);
}

//On launch --> test if new mirrors have been added. If so, download list for them
function refreshNewMirrorsMangaLists() {
  for (var i = 0; i < mirrors.length; i++) {
    if (mirrors[i].canListFullMangas && isMirrorActivated(mirrors[i].mirrorName)) {
      wssql.webdb.getMangaList(mirrors[i].mirrorName, function (list, mirror) {
        if (!list || list == null || list.length == 0) {
          console.log("New web site added : " + mirror + " --> loading manga list");
          getMangaMirror(mirror).getMangaList("", mangaListLoaded);
        }
      });
    }
  }
}

function mangaListLoaded(mirror, lst) {
  console.log("mirror manga list loaded for " + mirror + " list size : " + lst.length);
  wssql.webdb.empty(mirror, function () {
    wssql.webdb.storeMangaList(mirror, lst);
  });
}

function getMangaMirror(mirror) {
  //console.log("get Manga mirror called");
  for (var i = 0; i < mirrors.length; i++) {
    //console.log(mirrors[i].mirrorName + " --> " + mirror);
    if (mirrors[i].mirrorName == mirror) {
      return mirrors[i];
    }
  }
  return null;
}
/* Save the manga list in storage */
function saveList() {
  //console.log("saving current list");
  try {
    localStorage["mangas"] = getJSONList();
    try {
      refreshTag();
    } catch (e) {
      //
    }
  } catch (e) {
    //
  }
}

function refreshTag() {
  var nbNews = 0;
  //console.log("refreshTag");
  var listDone = [];
  for (var i = 0; i < mangaList.length; i++) {
    if (mangaList[i].listChaps.length > 0) {
      var shortName = formatMgName(mangaList[i].name);
      var found = false;
      for (var j = 0; j < listDone.length; j++) {
        if (listDone[j] == shortName) {
          found = true;
          break;
        }
      }
      if (!found || getParameters().groupmgs == 0) {
        var lastName = mangaList[i].listChaps[0][1];
        if (lastName != mangaList[i].lastChapterReadURL && mangaList[i].read == 0) {
          listDone[listDone.length] = shortName;
          nbNews++;
        }
      }
    }
  }
  var params = getParameters();
  if (nbNews == 0) {
    if (params.nocount == 1) {
      drawIcon(true);
      chrome.browserAction.setBadgeText({
        text : ""
      });
    } else {
      if (params.displayzero == 1) {
        chrome.browserAction.setBadgeText({
          text : "0"
        });
      } else {
        chrome.browserAction.setBadgeText({
          text : ""
        });
      }
      chrome.browserAction.setBadgeBackgroundColor({
        color : [127, 127, 127, 255]
      });
    }
  } else {
    if (params.nocount == 1) {
      drawIcon(false);
      chrome.browserAction.setBadgeText({
        text : ""
      });
    } else {
      chrome.browserAction.setBadgeText({
        text : nbNews.toString()
      });
      chrome.browserAction.setBadgeBackgroundColor({
        color : [255, 0, 0, 255]
      });
    }
  }
}

function hasNew() {
  for (var i = 0; i < mangaList.length; i++) {
    if (mangaList[i].listChaps.length > 0) {
      var lastName = mangaList[i].listChaps[0][1];
      if (lastName != mangaList[i].lastChapterReadURL && mangaList[i].read == 0) {
        return true;
      }
    }
  }
  return false;
}

function refreshUpdate() {
  try {
    var params = getParameters();
    params.updated = new Date().getTime();
    params.changesSinceSync = 1;
    //localStorage["parameters"] = $H(params).toJSON(); --> remove prototype usage
    localStorage["parameters"] = JSON.stringify(params);
  } catch (e) {}
}

function refreshUpdateSyncSite(update) {
  try {
    var params = getParameters();
    params.syncAMR = update;
    params.changesSinceSync = 0;
    //localStorage["parameters"] = $H(params).toJSON(); --> remove prototype usage
    localStorage["parameters"] = JSON.stringify(params);
  } catch (e) {}

}
function refreshUpdateWith(update) {
  try {
    var params = getParameters();
    params.updated = update;
    //localStorage["parameters"] = $H(params).toJSON(); --> remove prototype usage
    localStorage["parameters"] = JSON.stringify(params);
  } catch (e) {}
}

function resetUpdate() {
  try {
    var params = getParameters();
    params.updated = undefined;
    //localStorage["parameters"] = $H(params).toJSON(); --> remove prototype usage
    localStorage["parameters"] = JSON.stringify(params);
  } catch (e) {}
}

function refreshSync() {
  try {
    var params = getParameters();
    params.lastsync = new Date().getTime();
    //localStorage["parameters"] = $H(params).toJSON(); --> remove prototype usage
    localStorage["parameters"] = JSON.stringify(params);
  } catch (e) {}
}

function getJSONList() {
  var results = [];
  mangaList.each(function (object) {
    var value = jsonmangaelt(object);
    if (!Object.isUndefined(value))
      results.push(value);
  });
  return '[' + results.join(', ') + ']';
}

function jsonmangaelt(mangaelt) {
  var obj = {};
  //console.log("before manga mirror save");
  obj.mirror = mangaelt.mirror;
  //console.log("aftre");
  obj.name = mangaelt.name;
  obj.url = mangaelt.url;
  obj.lastChapterReadURL = mangaelt.lastChapterReadURL;
  obj.lastChapterReadName = mangaelt.lastChapterReadName;
  obj.read = mangaelt.read;
  obj.update = mangaelt.update;
  obj.display = mangaelt.display;
  obj.ts = mangaelt.ts;
  obj.upts = mangaelt.upts;

  //console.log("before saving length : " + mangaelt.listChaps.length);
  //obj.listChaps = $A(mangaelt.listChaps).toJSON(); --> remove prototype usage
  obj.listChaps = JSON.stringify(mangaelt.listChaps);
  // obj.cats = $A(mangaelt.cats).toJSON(); --> remove prototype usage
  obj.cats = JSON.stringify(mangaelt.cats);
  //return $H(obj).toJSON(); --> remove prototype usage
  return JSON.stringify(obj);
}

function getJSONListToSync() {
  var results = [];
  $.each(mangaList, function (index, object) {
    var value = jsonmangaelttosync(object);
    if (value !== undefined)
      results.push(value);
  });

  return '[' + results.join(', ') + ']';
}

function jsonmangaelttosync(mangaelt) {
  var obj = {};
  obj.mirror = mangaelt.mirror;
  obj.name = mangaelt.name;
  obj.url = mangaelt.url;
  obj.lastChapterReadURL = mangaelt.lastChapterReadURL;
  obj.lastChapterReadName = mangaelt.lastChapterReadName;
  obj.read = mangaelt.read;
  obj.update = mangaelt.update;
  obj.ts = mangaelt.ts;
  obj.display = mangaelt.display;
  // obj.cats = $A(mangaelt.cats).toJSON(); --> remove prototype usage
  obj.cats = JSON.stringify(mangaelt.cats);
  //return $H(obj).toJSON(); --> remove prototype usage
  return JSON.stringify(obj);
}

chrome.extension.getVersion = function () {
  if (!chrome.extension.version_) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", chrome.extension.getURL('manifest.json'), false);
    xhr.onreadystatechange = function () {
      if (this.readyState == 4) {
        var manifest = JSON.parse(this.responseText);
        chrome.extension.version_ = manifest.version;
      }
    };
    xhr.send();
  }
  return chrome.extension.version_;
}
function setclipboard(text) {
  var txt = document.createElement('textarea');
  txt.value = text;
  document.body.appendChild(txt);
  txt.select();
  document.execCommand('Copy');
  document.body.removeChild(txt);
}

function deleteMangas(mangasToDel) {
  var deleteAr = [];
  for (var i = 0; i < mangasToDel.length; i++) {
    var tmpManga = new MangaElt(mangasToDel[i]);
    var mangaExist = isInMangaListId(tmpManga.url);
    if (mangaExist != -1) {
      deleteAr[deleteAr.length] = mangaExist;
    }
  }
  deleteAr.sort(function (a, b) {
    return ((a < b) ? -1 : ((a == b) ? 0 : 1));
  });
  for (var i = deleteAr.length - 1; i >= 0; i--) {
    mangaList.remove(deleteAr[i], deleteAr[i]);
  }
}

function importMangas(mangas, merge) {
  var textOut = "";
  if (!merge) {
    textOut += 'Deleting all mangas...\n';
    var deleteAr = [];
    for (var i = 0; i < mangaList.length; i++) {
      textOut += "\t - Deleting manga entry in current list : " + mangaList[i].name + " in mirror : " + mangaList[i].mirror + "\n";
      deleteAr[deleteAr.length] = i;
      try {
        _gaq.push(['_trackEvent', 'DeleteManga', mangaList[i].mirror, mangaList[i].name]);
        //pageTracker._trackEvent('DeleteManga', request.name);
      } catch (e) {}
    }
    for (var i = deleteAr.length - 1; i >= 0; i--) {
      mangaList.remove(deleteAr[i], deleteAr[i]);
    }
  }

  textOut += 'Adding mangas...\n';
  //console.log('Adding mangas...');
  var lstTmp = mangas;
  for (var i = 0; i < lstTmp.length; i++) {
    var tmpManga = new MangaElt(lstTmp[i]);
    textOut += "\t - Reading manga entry : " + tmpManga.name + " in mirror : " + tmpManga.mirror + "\n";
    //console.log("\t - Reading manga entry : " + tmpManga.name + " in mirror : " + tmpManga.mirror);
    var mangaExist = isInMangaList(tmpManga.url);
    if (mangaExist == null) {
      textOut += "\t  --> Manga not found in current list, adding manga... " + "\n";
      //console.log("\t  --> Manga not found in current list, adding manga... ");
      if (!isMirrorActivated(tmpManga.mirror)) {
        activateMirror(tmpManga.mirror);
      }
      var last = mangaList.length;
      mangaList[last] = tmpManga;
      //mangaList[last].refreshLast();
      try {
        _gaq.push(['_trackEvent', 'AddManga', tmpManga.mirror, tmpManga.name]);
        //pageTracker._trackEvent('AddManga', newManga.name);
      } catch (e) {}
    } else {
      //Verify chapter last
      textOut += "\t  --> Manga found in current list, verify last chapter read. incoming : " + tmpManga.lastChapterReadURL + "; current : " + mangaExist.lastChapterReadURL + "\n";
      //console.log("\t  --> Manga found in current list, verify last chapter read. incoming : " + tmpManga.lastChapterReadURL + "; current : " + mangaExist.lastChapterReadURL);
      mangaExist.consult(tmpManga);
      //saveList();
      try {
        _gaq.push(['_trackEvent', 'ReadManga', tmpManga.mirror, tmpManga.name]);
        _gaq.push(['_trackEvent', 'ReadMangaChapter', tmpManga.name, tmpManga.lastChapterReadName]);
        //pageTracker._trackEvent('ReadManga', request.name, request.lastChapterReadName);
      } catch (e) {}
    }
  }
  refreshAllLasts();

  return textOut;
}

function updateFromSite(mangas, merge) {
  if (!merge) {
    var deleteAr = [];
    for (var i = 0; i < mangaList.length; i++) {
      deleteAr[deleteAr.length] = i;
      try {
        _gaq.push(['_trackEvent', 'DeleteManga', mangaList[i].mirror, mangaList[i].name]);
      } catch (e) {}
    }
    for (var i = deleteAr.length - 1; i >= 0; i--) {
      mangaList.remove(deleteAr[i], deleteAr[i]);
    }
  }
  //Treat manga entries
  for (var i = 0; i < mangas.length; i++) {
    var mg = mangas[i];
    if (mg.change == "new") {
      var tmpManga = new MangaElt(mg);
      if (!isMirrorActivated(tmpManga.mirror)) {
        activateMirror(tmpManga.mirror);
      }
      var last = mangaList.length;
      mangaList[last] = tmpManga;
      //mangaList[last].refreshLast();
      try {
        _gaq.push(['_trackEvent', 'AddManga', tmpManga.mirror, tmpManga.name]);
      } catch (e) {}
    } else if (mg.change == "delete") {
      var mangaExist = isInMangaListId(mg.url);
      if (mangaExist != -1) {
        try {
          _gaq.push(['_trackEvent', 'DeleteManga', mg.mirror, mg.name]);
        } catch (e) {}
        mangaList.remove(mangaExist, mangaExist);
      }
    } else {
      var tmpManga = new MangaElt(mg);
      var mangaExist = isInMangaList(tmpManga.url);
      if (mangaExist != null) {
        mangaExist.consult(tmpManga, true);
        try {
          _gaq.push(['_trackEvent', 'ReadManga', tmpManga.mirror, tmpManga.name]);
          _gaq.push(['_trackEvent', 'ReadMangaChapter', tmpManga.name, tmpManga.lastChapterReadName]);
        } catch (e) {}
      }
    }
  }
  refreshAllLasts();
  //saveList();
}
// This fuction should not exist as we will be using chrome.sync call.
function importBookmarks(bms, merge) {
  var textOut = "";
  if (!merge) {
    textOut += 'Deleting all bookmarks...\n';
    var deleteAr = [];
    if (bookmarks !== null) {
      for (var i = 0; i < bookmarks.length; i++) {
        textOut += "\t - Deleting bookmark entry in current list : (type: " + bookmarks[i].type + ", url: " + bookmarks[i].url + ", chapter url: " + bookmarks[i].chapUrl + ", mirror: " + bookmarks[i].mirror + ((bookmarks[i].type == "chapter") ? "" : ", scanName: " + bookmarks[i].scanName) + ", note: " + bookmarks[i].note + ")" + "\n";
        deleteAr[deleteAr.length] = i;
      }
      for (var i = deleteAr.length - 1; i >= 0; i--) {
        bookmarks.remove(deleteAr[i], deleteAr[i]);
      }
    }
  }

  textOut += 'Adding bookmarks...\n';
  var lstTmp = bms;
  for (var i = 0; i < lstTmp.length; i++) {
    textOut += "\t - Reading bookmark entry : (type: " + lstTmp[i].type + ", url: " + lstTmp[i].url + ", chapter url: " + lstTmp[i].chapUrl + ", mirror: " + lstTmp[i].mirror + ((lstTmp[i].type == "chapter") ? "" : ", scanName: " + lstTmp[i].scanName) + ", note: " + lstTmp[i].note + ")" + "\n"
    var isFound = false;
    var posFound;
    var obj = lstTmp[i];
    if (bookmarks.length > 0) {
      for (var j = 0; j < bookmarks.length; j++) {
        if (obj.mirror == bookmarks[j].mirror
           && obj.url == bookmarks[j].url
           && obj.chapUrl == bookmarks[j].chapUrl
           && obj.type == bookmarks[j].type) {
          if (obj.type == "chapter") {
            isFound = true;
            posFound = j;
            break;
          } else {
            if (obj.scanUrl == bookmarks[j].scanUrl) {
              isFound = true;
              posFound = j;
              break;
            }
          }
        }
      }
    }
    if (!isFound) {
      textOut += "\t  --> Bookmark not found in current list, adding bookmark... " + "\n";
      bookmarks[bookmarks.length] = {
        mirror : obj.mirror,
        url : obj.url,
        chapUrl : obj.chapUrl,
        type : obj.type,
        name : obj.name,
        chapName : obj.chapName,
        scanUrl : obj.scanUrl,
        scanName : obj.scanName,
        note : obj.note
      };
    } else {
      textOut += "\t  --> Bookmark already exist, update note.. " + "\n";
      bookmarks[posFound].note = obj.note;
    }
  }
  //localStorage["bookmarks"] = $A(bookmarks).toJSON(); --> remove prototype usage
  localStorage["bookmarks"] = JSON.stringify(bookmarks);
  return textOut;
}
init();
