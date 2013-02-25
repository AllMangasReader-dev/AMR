/*/////////////////////////////////////////////////////////////////////////////
//                                                                           //
//   All Mangas Reader : Follow updates of your favorite mangas sites.       //
//   Copyright (c) 2011 Pierre-Louis DUHOUX (pl.duhoux at gmail d0t com)     //
//                                                                           //
/////////////////////////////////////////////////////////////////////////////*/
/*
  This js needs jquery.
  His goal is to load all different mangas mirror specifics js and to create 
  the manga array.
*/
//var amrc_repository = "http://amrroot/community/latest/";
var amrc_repository = "http://community.allmangasreader.com/latest/";
//var amrc_root = "http://amrroot/community/";
var amrc_root = "http://community.allmangasreader.com/";

//##############################################################################
// Load websites description and code in one array. Do first load if necessary.
// Insert in database if first load.
//##############################################################################
function getMirrorsDescription(callback) {
  amrcsql.webdb.getWebsites(function(list) {
    var websites = list;
    if (websites != undefined && websites != null && websites.length > 0) {
      callback(websites);
    } else {
      // First load of websites
      $.ajax({
        url: amrc_repository + "websites.json",
        success: function(resp) {
          var ws = resp;
          for (var i = 0; i < ws.length; i++) {
            console.log("Load JS from repository for " + ws[i].mirrorName);
            loadJSFromRepository(ws[i]);
          }
          waitForFinishRepository(ws, callback);
        },
        error: function() {
          callback([]);
        }
      });
    }
  });
}

function loadJSFromRepository(description) {
  $.ajax({
      url: amrc_repository + description.jsFile,

      success: function( objResponse ){
        console.log("code loaded for " + description.mirrorName);
        description.jsCode = objResponse;
        console.log("insert " + description.mirrorName + " in database");
        amrcsql.webdb.storeWebsite(description, function() {
          description.loaded = true;
        });
      },
      
      error: function() {
        description.loaded = true;
      }
  });
}

function waitForFinishRepository(websites, callback) {
  var done = true;
  for (var i = 0; i < websites.length; i++) {
    if (!websites[i].loaded || websites[i].loaded == false) {
      done = false;
      break;
    }
  }
  if (done) {
    console.log("All websites loaded");
    console.log(websites);
    callback(websites);
  } else {
    setTimeout(function () {
      waitForFinishRepository(websites, callback);
    }, 100);
  }
}
//##############################################################################

//##############################################################################
// Update websites database from repository
//##############################################################################
function updateWebsitesFromRepository(callback) {
  $.ajax({
    url: amrc_repository + "websites.json?1",
    beforeSend: function(xhr) {
      xhr.setRequestHeader("Cache-Control", "no-cache");
      xhr.setRequestHeader("Pragma", "no-cache");
    },
    success: function(resp) {
      //distant descriptions
      var wsdist = resp;
      
      //local description
      amrcsql.webdb.getWebsites(function(list) {
        var wsloc = list;
        if (wsloc != undefined && wsloc != null && wsloc.length > 0) {
          //Compare loc and dist...
          //Check revision
          var changes = [];
          for (var i = 0; i < wsdist.length; i++) {
            var found = false;
            for (var j = 0; j < wsloc.length; j++) {
              if (wsdist[i].mirrorName == wsloc[j].mirrorName) {
                if (wsloc[j].revision != 0 && wsloc[j].revision < wsdist[i].revision) {
                  // Website has been updated...
                  console.log("Website has been updated " + wsdist[i].mirrorName);
                  var change = {description: wsdist[i], type: "update"};
                  updateJSFromRepository(wsdist[i], change);
                  changes[changes.length] = change;
                } else if (wsloc[j].revision == 0) {
                  // Temporary implementation locally for this website
                  // Do nothing...
                }
                found = true;
              }
            }
            if (!found) {
              //Check for new ones
              // Website is new...
              console.log("Website has been created " + wsdist[i].mirrorName);
              var change = {description: wsdist[i], type: "create"};
              updateJSFromRepository(wsdist[i], change);
              changes[changes.length] = change;
            }
          }
          
          //Check for deletion ?? --> not yet --> can't delete websites yet on AMRC.
          
          //If changes --> Reload implementations...
          if (changes.length > 0) {
            waitForFinishUpdatingRepository(changes, function() {
              callback();
            });
          } else {
            callback();
          }
        } else {
          console.log("Error --> No local websites ?? Reload the extension... !");
          callback();
        }
      });
    },
    error: function() {
      console.log("Error while updating websites repository. --> Repository not reachable...");
      callback();
    }
  });
}

function updateJSFromRepository(description, change) {
  $.ajax({
      url: amrc_repository + description.jsFile,

      success: function( objResponse ){
        console.log("code loaded for " + description.mirrorName);
        description.jsCode = objResponse;
        var isNew = false;
        if (change.type == "create") {
          console.log("insert " + description.mirrorName + " in database");
          amrcsql.webdb.storeWebsite(description, function() {
            change.loaded = true;
          });
          isNew = true;
        } else if (change.type == "update") {
          console.log("update " + description.mirrorName + " in database");
          amrcsql.webdb.updateWebsite(description, function() {
            change.loaded = true;
          });
        }
        //Notification
        var params = getParameters();
        if (params['shownotifws'] == 1) {
  	      var wsData = {ws: description.mirrorName, developer: description.developer, revision: description.revision, idext: description.id, isnew: isNew};
  	      var notification = window.webkitNotifications.createHTMLNotification('notifws.html#' + JSON.stringify(wsData));
                notification.show();
  	      if (params['notificationtimer'] > 0) {
  	        setTimeout(function() {
        		  notification.cancel();
        		}, params['notificationtimer'] * 1000);
  	      }
	      }
      },
      
      error: function() {
        change.loaded = true;
      }
  });
}

function waitForFinishUpdatingRepository(changes, callback) {
  var done = true;
  for (var i = 0; i < changes.length; i++) {
    if (!changes[i].loaded || changes[i].loaded == false) {
      done = false;
      break;
    }
  }
  if (done) {
    console.log("All websites updated successfully");
    callback();
  } else {
    setTimeout(function () {
      waitForFinishUpdatingRepository(changes, callback);
    }, 100);
  }
}
//##############################################################################

//##############################################################################
// Functions to import non released versions of websites
//##############################################################################

function importImplentationFromId(id, callback) {
  $.ajax({
    url: amrc_root + "service.php?name=implementation_get&id=" + id,
    beforeSend: function(xhr) {
      xhr.setRequestHeader("Cache-Control", "no-cache");
      xhr.setRequestHeader("Pragma", "no-cache");
    },
    success: function(resp) {
      //distant description
      var description = JSON.parse(resp);

      //local description
      getMirrorsDescription(function(list) {
        var wsloc = list;
        if (wsloc != undefined && wsloc != null && wsloc.length > 0) {
          var found = null;
          for (var j = 0; j < wsloc.length; j++) {
            if (description.mirrorName == wsloc[j].mirrorName) {
              found = wsloc[j];
              break;
            }
          }
          console.log("description loaded for " + description.mirrorName);
          var isNew = false;
          description.revision = 0;
          if (found == null) {
            //Ajout de l'implem
            console.log("insert " + description.mirrorName + " in database");
            isNew = true;
            amrcsql.webdb.storeWebsite(description, function() {
              finishImportAfterInsert(description, callback, isNew);
            });
          } else {
            //Mise à jour de l'implem
            console.log("update " + description.mirrorName + " in database");
            amrcsql.webdb.updateWebsite(description, function() {
              finishImportAfterInsert(description, callback, isNew);
            });
          }
        } else {
          console.log("Error --> No local websites ?? Reload the extension... !");
          callback();
        }
      });
    },
    error: function() {
      console.log("Error while importing an implementation from repository. --> Repository not reachable...");
      callback();
    }
  });
}

function finishImportAfterInsert(description, callback, isNew) {
  //Notification
  var params = getParameters();
  if (params['shownotifws'] == 1) {
    var wsData = {ws: description.mirrorName, developer: description.developer, revision: description.revision, idext: description.id, isnew: isNew};
    var notification = window.webkitNotifications.createHTMLNotification('notifws.html#' + JSON.stringify(wsData));
          notification.show();
    if (params['notificationtimer'] > 0) {
      setTimeout(function() {
  		  notification.cancel();
  		}, params['notificationtimer'] * 1000);
    }
  }
  callback(description.mirrorName);
}

function releaseImplentationFromId(id, callback) {
  $.ajax({
    url: amrc_root + "service.php?name=implementation_getrelease&id=" + id,
    beforeSend: function(xhr) {
      xhr.setRequestHeader("Cache-Control", "no-cache");
      xhr.setRequestHeader("Pragma", "no-cache");
    },
    success: function(resp) {
      //distant description
      var description = JSON.parse(resp);
      
      //local description
      getMirrorsDescription(function(list) {
        var wsloc = list;
        if (wsloc != undefined && wsloc != null && wsloc.length > 0) {
          var found = null;
          for (var j = 0; j < wsloc.length; j++) {
            if (description.mirrorName == wsloc[j].mirrorName) {
              found = wsloc[j];
              break;
            }
          }
          console.log("description loaded for " + description.mirrorName);
          var isNew = false;
          if (found == null) {
            //Ajout de l'implem
            console.log("insert " + description.mirrorName + " in database");
            isNew = true;
            amrcsql.webdb.storeWebsite(description, function() {callback(description.mirrorName);});
          } else {
            //Mise à jour de l'implem
            console.log("update " + description.mirrorName + " in database");
            amrcsql.webdb.updateWebsite(description, function() {callback(description.mirrorName);});
          }
          //Notification
          var params = getParameters();
          if (params['shownotifws'] == 1) {
    	      var wsData = {ws: description.mirrorName, developer: description.developer, revision: description.revision, idext: description.id, isnew: isNew};
    	      var notification = window.webkitNotifications.createHTMLNotification('notifws.html#' + JSON.stringify(wsData));
                  notification.show();
    	      if (params['notificationtimer'] > 0) {
    	        setTimeout(function() {
          		  notification.cancel();
          		}, params['notificationtimer'] * 1000);
    	      }
    	    }
        } else {
          console.log("Error --> No local websites ?? Reload the extension... !");
          callback();
        }
      });
    },
    error: function() {
      console.log("Error while importing an implementation from repository. --> Repository not reachable...");
      callback();
    }
  });
}
//##############################################################################

//##############################################################################
// Functions to get websites...
//##############################################################################

function getFilledMirrorsDesc(activatedMirrors, callback) {
  getMirrorsDescription(function(list) {
    var wsloc = list;
    var filledMD = [];
    for (var i = 0; i < wsloc.length; i++) {
      for (var j = 0; j < activatedMirrors.length; j++) {
        if (activatedMirrors[j].mirror == wsloc[i].mirrorName) {
          filledMD[filledMD.length] = wsloc[i];
          break;
        }
      }
    }
    callback(filledMD);
  });
}

function getMirrors(callback) {
  getMirrorsDescription(function(list) {
    var wsloc = list;
    var mirrorsTmp = [];
    for (var i = 0; i < wsloc.length; i++) {
      var isOk = false;
      try {
        eval(wsloc[i].jsCode);
        isOk = true;
      } catch (e) {
        console.log("Impossible to load the following website. JS does not compile... --> " + e.message);
        console.log(wsloc[i]);
      }
      if (isOk) {
        var cur = mirrorsTmp.length;
        mirrorsTmp[cur] = eval(wsloc[i].objectName);
        //console.log(mirrorsTmp[cur]);
        mirrorsTmp[cur].mirrorName = wsloc[i].mirrorName;
        mirrorsTmp[cur].mirrorIcon = wsloc[i].mirrorIcon;
        mirrorsTmp[cur].revision = wsloc[i].revision;
        mirrorsTmp[cur].developer = wsloc[i].developer;
        mirrorsTmp[cur].idext = wsloc[i].idext;
      }
    }
    callback(mirrorsTmp);
  });
}

function doesCurrentPageMatchManga(url, activatedMirrors, callback) {
  getMirrorsDescription(function(list) {
    var wsloc = list;
    var isok = false;
    for (var i = 0; i < wsloc.length; i++) {
      var isFound = false;
      for (var j = 0; j < activatedMirrors.length; j++) {
        if (activatedMirrors[j].mirror == wsloc[i].mirrorName) {
          isFound = true;
          break;
        }
      }
      if (isFound) {
        var wss = JSON.parse(wsloc[i].webSites);
        for (var j = 0; j < wss.length; j++) {
          //console.log(wss[j] + " --> " + url);
          if (url.match(wss[j].replace(/\./g, "\\.").replace(/\*/g, ".*"))) {
            callback(true, wsloc[i].mirrorName);
            isok = true;
            return;
          }
        }
      }
    }
    if (!isok) callback(false, "");
  });
}

function getActivatedMirrors(callback) {
  chrome.extension.sendRequest({action: "activatedMirrors"}, function (res) {
    getActivatedMirrorsWithList(res, callback);
  });
}

function getActivatedMirrorsWithList(res, callback) {
  getMirrorsDescription(function(listws) {
    var wsloc = listws;
    var mirrorsTmp = [];
    var lstAc = res.list;
    for (var i = 0; i < wsloc.length; i++) {
      for (var j = 0; j < lstAc.length; j++) {
        if (lstAc[j].mirror == wsloc[i].mirrorName) {
          var isOk = false;
          try {
            eval(wsloc[i].jsCode);
            isOk = true;
          } catch (e) {
            console.log("Impossible to load the following website. JS does not compile... --> " + e.message);
            console.log(wsloc[i]);
          }
          if (isOk) {
            var cur = mirrorsTmp.length;
            mirrorsTmp[cur] = eval(wsloc[i].objectName);
            mirrorsTmp[cur].mirrorName = wsloc[i].mirrorName;
            mirrorsTmp[cur].mirrorIcon = wsloc[i].mirrorIcon;
            mirrorsTmp[cur].revision = wsloc[i].revision;
            mirrorsTmp[cur].developer = wsloc[i].developer;
            mirrorsTmp[cur].idext = wsloc[i].idext;
            mirrorsTmp[cur].listLoaded = false;
            if (mirrorsTmp[cur].canListFullMangas) {
              wssql.webdb.getMangaList(mirrorsTmp[cur].mirrorName, function(list) {
                mirrorsTmp[cur].listmgs = list;
                mirrorsTmp[cur].listLoaded = true;
              });
            } else {
              mirrorsTmp[cur].listLoaded = true;
            }
          }
          break;
        }
      }
    }
    waitForActivatedAndListFinish(mirrorsTmp, callback);
  });
}

function waitForActivatedAndListFinish(mirrorsT, callback) {
  var fin = true;
  for (var i = 0; i < mirrorsT.length; i++) {
    if (!mirrorsT[i].listLoaded) fin = false;
  }
  if (fin) {
    callback(mirrorsT);
  } else {
    setTimeout(function () {
      waitForActivatedAndListFinish(mirrorsT, callback);
    }, 100);
  }
}
