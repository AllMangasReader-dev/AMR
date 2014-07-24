/**

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

//Manga list known from server
var mglstacc;
var tsacc;

var icons;

Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

$(function() {
  //Show AMR buttons.
  $(".warning").hide();
  $(".amrlistmanager").show();
  $("#mangalist").addClass("amralive");
  //Recover list from server;
  $("script").each(function(index) {
    if ($(this).text().indexOf("var mglistaccount") != -1) {
      var pos = $(this).text().indexOf("var mglistaccount");
      var end = $(this).text().indexOf("];", pos);
      eval($(this).text().substring(pos, end+2));
      mglstacc = mglistaccount;
    }
    if ($(this).text().indexOf("var mglistsync") != -1) {
      var pos = $(this).text().indexOf("var mglistsync");
      var end = $(this).text().indexOf(";", pos);
      eval($(this).text().substring(pos, end+1));
      tsacc = mglistsync;
    }
  });
  
  $.getScript(
    "js/mirroricons.js",
    function(resp) {
      eval(resp);
      icons = mirroricons;
    }
  );
  
  $(".updateamrlist .button").click(clickOnUpdate);
  
  $(".forceuploadamr").click(function() {onButtonClickAsync($(this), replaceServerList);});
  $(".forcedownloadamr").click(function() {onButtonClickAsync($(this), replaceLocalList);});
  
});

function clickOnUpdate() {
  //Get extension list
  var mglstext;
  var _self = this;
  chrome.runtime.sendMessage({action: "mangaList"}, function(res) {
    var updtServ = updateServer(tsacc, res.ts, res.haschange);
    
    var lstmerge;
    mglstext = res.lst;
    
    $(_self).addClass("disabled");
    $(_self).unbind("click");
    
    $("#mangalist").empty();
    
    if (updtServ == 0 || updtServ == 2) {
      $("#mangalist").after($("<div class=\"rightbut validationamr\"><a class=\"button validateamr tip\">Validate<span>Click here to send the selected updates online.</span></a>&nbsp;&nbsp;<a class=\"button cancelamr tip\" onclick=\"loadList();\">Cancel<span>Back to your online list</span></a></div>"));
      
      $(".globalamractions").hide();
      $(".validateamr").click(function() {onButtonClickAsync($(this), validateUpdateServer);});
      $(".cancelamr").click(function() {
        $(".validationamr").remove();
        $(".globalamractions").show();
        $(".updateamrlist .button").removeClass("disabled");
        $(".updateamrlist .button").click(clickOnUpdate);
      });

      lstmerge = mergeLists(mglstacc, mglstext);
      //Sort entries for rendering
      lstmerge = sortList(lstmerge);
      
      displayList(lstmerge, true);
    } else if (updtServ == 1) {
      $("#mangalist").after($("<div class=\"rightbut validationamr\"><a class=\"button validateamr tip\">Validate<span>Click here to update you local list with these changes.</span></a>&nbsp;&nbsp;<a class=\"button cancelamr tip\" onclick=\"loadList();\">Cancel<span>Back to your online list</span></a></div>"));
      
      $(".globalamractions").hide();
      $(".validateamr").click(function() {onButtonClickAsync($(this), validateUpdateExt);});
      $(".cancelamr").click(function() {
        $(".validationamr").remove();
        $(".globalamractions").show();
        $(".updateamrlist .button").removeClass("disabled");
        $(".updateamrlist .button").click(clickOnUpdate);
      });
      
      lstmerge = mergeLists(mglstext, mglstacc);
      //Sort entries for rendering
      lstmerge = sortList(lstmerge);
  
      displayList(lstmerge, false);
    } else {
      $("<h3>Synchronization conflict : You have changes in your local list but server version is more recent. You must choose to download (erase your local changes) or upload (erase distant changes) your list.</h3>").appendTo($("#mangalist"));
      $("#mangalist").after($("<div class=\"rightbut validationamr\"><a class=\"button cancelamr tip\" onclick=\"loadList();\">Cancel<span>Back to your online list</span></a></div>"));
      $(".cancelamr").click(function() {
        $(".validationamr").remove();
        $(".globalamractions").show();
        $(".updateamrlist .button").removeClass("disabled");
        $(".updateamrlist .button").click(clickOnUpdate);
      });
      
      
      //MANAGE CONFLICTS !! --> Not used now because quite difficult... Future...
      /*var lstmergeOutgoing = mergeLists(mglstacc, mglstext);
      var lstmergeIncoming = mergeLists(mglstext, mglstacc);
      
      var lstConflicts = getAndRemoveConflictualEntries(lstmergeOutgoing, lstmergeIncoming);
      
      if (lstConflicts.length > 0) {
        $("<h3>Synchronization conflict : You have changes in your local list but server version is more recent.</h3>").appendTo($("#mangalist"));
      } else {
        $("<h3>You have changes in your local list but server version is more recent, fortunaltely, no conflicts seems to exist. You can see below the incoming and outgoing entries. Click on validate to do these changes, else, click cancel and choose Download or Upload to solve the conflicts.</h3>").appendTo($("#mangalist"));
      }
      var tb = $("<table class=\"formfilllt\"></table>");
      
      var trout = $("<tr><td class=\"rotatetd\"><div class=\"rotate\">Outgoing</div></td><td class=\"list\"></td>");
      //Sort entries for rendering
      lstmergeOutgoing = sortList(lstmergeOutgoing);
      displayList(lstmergeOutgoing, true, $(".list", trout), true);
      var trin = $("<tr><td class=\"rotatetd\"><div class=\"rotate\">Incoming</div></td><td class=\"list\"></td>");
      lstmergeIncoming = sortList(lstmergeIncoming);
      displayList(lstmergeIncoming, false, $(".list", trin), true);
      
      trout.appendTo(tb);
      trin.appendTo(tb);
      tb.appendTo($("#mangalist"));
      
      $("#mangalist").after($("<div class=\"rightbut validationamr\"><a class=\"button validateamr tip\">Validate<span>Click here to do the changes.</span></a>&nbsp;&nbsp;<a class=\"button cancelamr tip\" onclick=\"loadList();\">Cancel<span>Back to your online list</span></a></div>"));
      
      $(".globalamractions").hide();
      $(".validateamr").click(function() {onButtonClickAsync($(this), validateUpdateExt);}); //TODO CHANGE !!
      $(".cancelamr").click(function() {
        $(".validationamr").remove();
        $(".globalamractions").show();
        $(".updateamrlist .button").removeClass("disabled");
        $(".updateamrlist .button").click(clickOnUpdate);
      });*/
    }
  });
}

function sortIntDesc(a, b) {
  if (a == b) {
    return 0;
  } else if (a < b) {
    return 1;
  } else {
    return -1;
  }
  //return ((a == b) ? 0 : ((a < b) 1 : -1));
}
function getAndRemoveConflictualEntries(outgoing, incoming) {
  var removeIncome = [];
  var removeOutgoing = [];
  var conflicts = [];
  
  for (var i = 0; i < outgoing.length; i++) {
    var foundEx = findSameMgId(outgoing[i], incoming);
    if (foundEx != -1) {
      if (outgoing[i].change && incoming[foundEx].change) {
        removeOutgoing[removeOutgoing.length] = i;
        removeIncome[removeIncome.length] = foundEx;
        conflicts[conflicts.length] = outgoing[i];
      }
    }
  }

  if (removeIncome.length > 0) {
    console.log("sort");
    console.log(removeIncome);
    removeIncome.sort(sortIntDesc);
    console.log(removeIncome);
    for (var i = removeIncome.length - 1; i >= 0; i--) {
      incoming.remove(removeIncome[i], removeIncome[i]);  
    }
  }
  
  if (removeOutgoing.length > 0) {
    removeOutgoing.sort(sortIntDesc);
    for (var i = removeOutgoing.length - 1; i >= 0; i--) {
      outgoing.remove(removeOutgoing[i], removeOutgoing[i]);  
    }
  }
  
  return conflicts;
}

// Return 0 for update server
//        1 for update extension
//        2 for nothing to do
//        3 for error
function updateServer(tsServer, tsExt, modifsInExt) {
  console.log("server : " + tsServer + " ext : " + tsExt + " hasModifs : " + modifsInExt);
  if (tsServer == 0) {
    return 0;
  } else {
    if (modifsInExt && tsExt == tsServer) {
      return 0;
    } else if (tsServer > tsExt && !modifsInExt) {
      return 1;
    } else if (tsServer == tsExt) {
      return 2;
    } else {
      return 3
    }
  }
}

function setChapNoTot(lst) {
  if (lst.length > 0) {
    for (var i = 0; i < lst.length; i++) {
      if (!lst[i].chapno) {
        lst[i].chapno = findChapNo(lst[i]);
      }
      if (!lst[i].nbchaps) {
        lst[i].nbchaps = findTotalChap(lst[i]);
      }
      if (!lst[i].lastChapterReadName || lst[i].lastChapterReadName == "") {
        lst[i].lastChapterReadName = findRealName(lst[i]);
      }
      if (!lst[i].lastupdate) {
        lst[i].lastupdate = lst[i].ts;
      }
    }
  }
}
function mergeLists(server, exten) {
  var lstres = [];
  
  setChapNoTot(server);
  setChapNoTot(exten);
  
  //First : look for changes in server list
  if (server.length > 0) {
    for (var i = 0; i < server.length; i++) {
      var foundEx = findSameMg(server[i], exten);
      if (foundEx != null) {
        var toAdd = server[i];
        //Compare server and exten
        var lstChanges = [];
        //Compare chapters
        if (foundEx.lastChapterReadURL != server[i].lastChapterReadURL) {
          lstChanges[lstChanges.length] = "chapter";
          toAdd.oldlastChapterReadURL = server[i].lastChapterReadURL;
          toAdd.oldlastChapterReadName = server[i].lastChapterReadName;
          toAdd.lastChapterReadURL = foundEx.lastChapterReadURL;
          toAdd.lastChapterReadName = foundEx.lastChapterReadName;
          //Change chapNo;
          toAdd.oldchapno = server[i].chapno;
          toAdd.oldnbchaps = server[i].nbchaps;
          toAdd.chapno = foundEx.chapno;
          toAdd.nbchaps = foundEx.nbchaps;
          toAdd.lastupdate = foundEx.lastUpdate;
        } else {
          //Check if there is new unread chapter (total chap number changed)
          if (foundEx.nbchaps > 0 && (foundEx.nbchaps != server[i].nbchaps || foundEx.chapno != server[i].chapno)) {
            lstChanges[lstChanges.length] = "newunread";
            toAdd.oldchapno = server[i].chapno;
            toAdd.oldnbchaps = server[i].nbchaps;
            toAdd.chapno = foundEx.chapno;
            toAdd.nbchaps = foundEx.nbchaps;
          }
        }
        //Compare read
        if (foundEx.read != server[i].read) {
          lstChanges[lstChanges.length] = "read";
          toAdd.oldread = server[i].read;
          toAdd.read = foundEx.read;
        }
        //Compare display
        if (foundEx.display != server[i].display) {
          lstChanges[lstChanges.length] = "display";
          toAdd.olddisplay = server[i].display;
          toAdd.display = foundEx.display;
        }
        //Compare cats (in both directions...)
        var isDiff = false;
        if (foundEx.cats.length > 0) {
          if (server[i].cats.length == 0) {
            isDiff = true;
          } else {
            for (var k = 0; k < foundEx.cats.length; k++) {
              var isFound = false;
              for (var j = 0; j < server[i].cats.length; j++) {
                if (server[i].cats[j] == foundEx.cats[k]) {
                  isFound = true;
                  break;
                }
              }
              if (!isFound) {
                isDiff = true;
                break;
              }
            }
          }
        } else {
          if (server[i].cats.length > 0) {
            isDiff = true;
          }
        }
        if (!isDiff) {
          if (server[i].cats.length > 0) {
            if (foundEx.cats.length == 0) {
              isDiff = true;
            } else {
              for (var k = 0; k < server[i].cats.length; k++) {
                var isFound = false;
                for (var j = 0; j < foundEx.cats.length; j++) {
                  if (foundEx.cats[j] == server[i].cats[k]) {
                    isFound = true;
                    break;
                  }
                }
                if (!isFound) {
                  isDiff = true;
                  break;
                }
              }
            }
          } else {
            if (foundEx.cats.length > 0) {
              isDiff = true;
            }
          }
        }
        if (isDiff) {
          lstChanges[lstChanges.length] = "cats";
          toAdd.oldcats = server[i].cats;
          toAdd.cats = foundEx.cats;
        }
        
        //Add it to result
        if (lstChanges.length > 0) {
          toAdd.change = "update";
          toAdd.updatemode = lstChanges;
          lstres[lstres.length] = toAdd;
        } else {
          lstres[lstres.length] = server[i];
        }
      } else {
        //Mark it as to delete
        server[i].change = "delete";
        lstres[lstres.length] = server[i];
      }
    }
  }
  //Second : browse exten list to find new mangas
  if (exten.length > 0) {
    for (var i = 0; i < exten.length; i++) {
      var foundSer = findSameMg(exten[i], server);
      if (foundSer == null) {
        //New entry --> add it
        var newentry = {};
        newentry.mirror = exten[i].mirror;
        newentry.url = exten[i].url;
        newentry.name = exten[i].name;
        newentry.lastChapterReadURL = exten[i].lastChapterReadURL;
        if (exten[i].lastChapterReadName != undefined) {
          newentry.lastChapterReadName = exten[i].lastChapterReadName;
        } else {
          newentry.lastChapterReadName = findRealName(exten[i]);
        }
        newentry.chapno = exten[i].chapno;
        newentry.nbchaps = exten[i].nbchaps;
        newentry.read = exten[i].read;
        newentry.display = exten[i].display;
        newentry.cats = exten[i].cats;
        newentry.lastupdate = exten[i].lastupdate;
        
        newentry.change = "new";
        lstres[lstres.length] = newentry;
      }
    }
  }
  return lstres;
}

function sortList(mangas) {
  //Sort by name
  sortByShortName(mangas);
  
  //Build groups
  var mangasGrps = [];
  var ancShName;
  var mgTemp = [];
  for (var i = 0; i < mangas.length; i++) {
    if (!(!ancShName || mangas[i].shortName == ancShName)) {
      if (mgTemp.length == 1) {
        mangasGrps[mangasGrps.length] = mgTemp[0];
      } else {
        //Sort by new inside group
        sortByNewMirror(mgTemp);
        var pos = mangasGrps.length;
        mangasGrps[pos] = [];
        $.each(mgTemp, function(index, val) {
          mangasGrps[pos][index] = val;
        });
      }
      mgTemp = [];
    }
    mgTemp[mgTemp.length] = mangas[i];
    ancShName = mangas[i].shortName;
  }
  
  //Treat last group
  if (mgTemp.length == 1) {
    mangasGrps[mangasGrps.length] = mgTemp[0];
  } else {
    //Sort by new inside group
    sortByNewMirror(mgTemp);
    var pos = mangasGrps.length;
    mangasGrps[pos] = [];
    $.each(mgTemp, function(index, val) {
      mangasGrps[pos][index] = val;
    });
  }
  
  //Sort group by new
  sortByNewShortName(mangasGrps);
  
  return mangasGrps;
}

function formatMgName(name) {
  if (name == undefined || name == null || name == "null") return "";
  return name.trim().replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

//Sort a list of manga (or group of mangas) by new and then by name
function sortByNewShortName(lst) {
  lst.sort(function(aG, bG) {
    var a, b;
    if (aG.length) {a = aG[0];} else {a = aG;}
    if (bG.length) {b = bG[0];} else {b = bG;}
    
    var isNewA = isNew(a);
    var isNewB = isNew(b);
    
    if (isNewA && !isNewB) return -1;
    if (!isNewA && isNewB) return 1;
    
    if (!a.shortName) a.shortName = formatMgName(a.name);
    if (!b.shortName) b.shortName = formatMgName(b.name);
    
    if (a.shortName == b.shortName) {
      if (a.mirror == b.mirror) return 0;
      else if (a.mirror > b.mirror) return 1;
      else return -1;
    } else {
      if (a.shortName >  b.shortName) return 1;
      else return -1;
    }
  });
}
//Sort a list of manga by name
function sortByShortName(lst) {
  lst.sort(function(a, b) {
    if (!a.shortName) a.shortName = formatMgName(a.name);
    if (!b.shortName) b.shortName = formatMgName(b.name);

    if (a.shortName == b.shortName) {
      if (a.mirror == b.mirror) return 0;
      else if (a.mirror > b.mirror) return 1;
      else return -1;
    } else {
      if (a.shortName > b.shortName) return 1;
      else return -1;
    }
  });
}

//Sort a list of manga by new and then by mirror name
function sortByNewMirror(lst) {
  lst.sort(function(a, b) {
    var isNewA = isNew(a);
    var isNewB = isNew(b);
    
    if (isNewA && !isNewB) return -1;
    if (!isNewA && isNewB) return 1;
    
    return (a.mirror < b.mirror) ? -1 : ((a.mirror == b.mirror) ? 0 : 1);
  });
}

function findChapNo(extobj) {
  var pos = 0;
  if (extobj.listChaps != undefined) {
    for (var i = 0; i < extobj.listChaps.length; i++) {
      if (extobj.listChaps[i][1] == extobj.lastChapterReadURL) {
        pos = extobj.listChaps.length - i;
        break;
      }
    }
  }
  return pos;
}
function findRealName(extobj) {
  var res = "";
  if (extobj.listChaps != undefined) {
    for (var i = 0; i < extobj.listChaps.length; i++) {
      if (extobj.listChaps[i][1] == extobj.lastChapterReadURL) {
        res = extobj.listChaps[i][0];
        break;
      }
    }
  }
  return res;
}
function findTotalChap(extobj) {
  if (extobj.listChaps != undefined) {
    return extobj.listChaps.length;
  }
  return 0;
}

function findSameMg(mg, lst) {
  for (var i = 0; i < lst.length; i++) {
    if (mg.mirror == lst[i].mirror && 
      mg.url == lst[i].url) {
      return lst[i];  
    }
  }
  return null;
}
function findSameMgId(mg, lst) {
  for (var i = 0; i < lst.length; i++) {
    if (mg.mirror == lst[i].mirror && 
      mg.url == lst[i].url) {
      return i;  
    }
  }
  return -1;
}

//Returns true if manga has new chapter
function isNew(mg) {
  return (mg.chapno != mg.nbchaps) && (mg.read == 0);
}

//Each entry contains : 
// - mirror : mirror
// - url : manga url
// - name : manga name 
// - lastChapterReadURL : chapter url
// - lastChapterReadName : chapter name
// - chapno : position of chapter in chapters list
// - nbchaps : total number of chapters
// - read : read status
// - display : display mode
// - cats : categories list
// - change : optional : "new", "update", "delete"
// - updatemode : optional if change == "update" : list of ["chapter", "read", "display", "cats", "newunread"]
// - oldlastChapterReadURL : optional old chapter url if changed
// - oldlastChapterReadName : optional chapter name if changed
// - oldread : optional read status if changed
// - olddisplay : optional display mode if changed
// - oldcats : optional categories list if changed
// - oldchapno : old position of chapter in chapters list
// - oldnbchaps : old total number of chapters
// - selected : default true : can be unselected by user 
function displayList(lst, updtSrv, where, noinfo) {
  if (where == undefined) {
    where = $("#mangalist");
  }
  if (noinfo == undefined) {
    noinfo = false;
  }
  if (lst != null && lst.length == 0) {
    $("<h3>Your manga list is empty</h3>").appendTo(where);
  } else {
    var hasChanges = false;
    if (lst != null) {
      for (var i = 0; i < lst.length; i++) {
        if (lst[i].length) {
          for (var j = 0; j < lst[i].length; j++) {
            if (lst[i][j].change) {
              hasChanges = true;
            }
          }
        } else {
          if (lst[i].change) {
            hasChanges = true;
          }
        }
      }
    }
    if (hasChanges) {
      if (!noinfo) {
        if (updtSrv) {
          $("<h3>These changes will be made on the online list because you have recent changes in your extension list.</h3>").appendTo(where);
        } else {
          $("<h3>These changes will be made on your local list because you server list is more recent.</h3>").appendTo(where);
        }
      }
      var tb = $("<table class=\"mgLst\"><thead><tr><td class=\"checker\"><div class=\"tip leftstick\"><input type=\"checkbox\" checked=\"checked\"/><span>Select updates to send to AMR's server and validate to send data.</span></div></td><td class=\"title\" colspan=\"3\"><div class=\"tip left\">Manga Name - Categories - Website - Chapter name<span>Click on the manga name to go read this manga on the corresponding web site (if there are multiple websites for the same manga, click on the website icon). Click on the chapter name to go read the chapter online.</span></div></td><td class=\"proghead\">Reading Progression</td></tr></thead><tbody></tbody><tfoot><tr><td class=\"empty\"></td><td colspan=\"3\" class=\"resume\"><span class=\"title\"></span></td><td class=\"progression\"></td></tr></tfoot></table>");
      tb.appendTo(where);
      var nbmg = 0;
      var nbchaps = 0;
      var totchap = 0;
      var nbmgdiff = 0;
      for (var i = 0; i < lst.length; i++) {
        nbmgdiff++;
        var stat;
        if (lst[i].length) {
          stat = addMultipleMangas(lst[i], $(tb, "tbody"));
        } else {
          stat = addSingleManga(lst[i], $(tb, "tbody"));
        }
        //console.log(stat);
        nbmg += stat.nbmg;
        nbchaps += parseInt(stat.nbchap, 10);
        totchap += parseInt(stat.chaptot, 10);
      }
      $("tfoot .resume .title", tb).text(nbmgdiff + " manga read at " + nbmg + " places.");
      createProgression(nbchaps, totchap, $("tfoot", tb), true);
      
      bindActions();
    } else {
      if (!noinfo) {
        var t = $("<div class='nochange'><span>No changes found.</span>&nbsp;<a class=\"viewlist button\" onclick=\"loadList();\">Click here to view list</a></div>");
        $(".validationamr").remove();
        t.appendTo(where);
        $(".viewlist", t).click(function() {
          $(".globalamractions").show();
          $(".updateamrlist .button").removeClass("disabled");
          $(".updateamrlist .button").click(clickOnUpdate);
        });
      } else {
        var t = $("<div class='nochange'><span>No changes found.</span></div>");
        t.appendTo(where);
      }
    }
  }
}

function bindActions() {
  $(".mgLst tbody tr").click(function(e) {
    if (event.target.type !== 'checkbox') {
      var ck = $(".checker input", $(this));
      ck[0].checked = !ck[0].checked;
      ck.triggerHandler('click');
    }
  });
  $(".mgLst tbody tr .checker input").click(function(e) {
    if ($(this).closest("tr").is(".head")) {
      var n = $(this).closest("tr").next();
      while (n.size() != 0 && !n.is(".head") && !n.is(".single")) {
        if ($(".checker input", n).size() > 0) {
          $(".checker input", n)[0].checked = this.checked;
        }
        n = n.next();
      }
      $(this).css("opacity", "1");
    }
    if ($(this).closest("tr").is(".body")) {
      var parentTr = $(this).closest("tr").prevAll(".head").first();
      var parentChecker = $(".checker input", parentTr);
      var n = parentTr.next();
      var nbchecked = 0;
      var nbunchecked = 0;
      //console.log(n);
      
      while (n.size() != 0 && !n.is(".head") && !n.is(".single")) {
        if ($(".checker input", n).size() > 0) {
          if ($(".checker input", n).is(":checked")) {
            nbchecked++;
          } else {
            nbunchecked++;
          }
        }
        n = n.next();
      }

      if (nbchecked == 0) {
        parentChecker.prop("checked", false);
        parentChecker.css("opacity", "1");
      } else if (nbunchecked == 0) {
        parentChecker.prop("checked", true);
        parentChecker.css("opacity", "1");
      } else {
        parentChecker.prop("checked", true);
        parentChecker.css("opacity", "0.5");
      }
    }
    checkMain($(this));
    e.stopPropagation();
  });
  $(".mgLst thead tr .checker input").click(function(e) {
    var _self = this;
    $(".mgLst tbody tr .checker input").each(function(index) {
      this.checked = _self.checked;
      $(this).css("opacity", "1");
    });
    $(this).css("opacity", "1");
  });
}

function checkMain(ck) {
  var nbchecked = 0;
  var nbunchecked = 0;
  $(".mgLst tbody tr .checker input").each(function(index) {
    if ($(this).is(":checked")) {
      nbchecked++;
    } else {
      nbunchecked++;
    }
  });
  
  var parCheck = $(".mgLst thead .checker input");
  if (nbchecked == 0) {
    parCheck.prop("checked", false);
    parCheck.css("opacity", "1");
  } else if (nbunchecked == 0) {
    parCheck.prop("checked", true);
    parCheck.css("opacity", "1");
  } else {
    parCheck.prop("checked", true);
    parCheck.css("opacity", "0.5");
  }
}

function addMultipleMangas(mgs, where) {
  var hasChanges = false;
  for (var i = 0; i < mgs.length; i++) {
    if (mgs[i].change) {
      hasChanges = true;
    }
  }
  if (hasChanges) {
    //Head
    var trHead = $("<tr class=\"mangaentry head" + (mgs[0].read == 1 ? " read" : (isNew(mgs[0]) ? " new": "")) + "\"><td class=\"checker\"><input type=\"checkbox\" checked=\"checked\"/></td><td colspan=\"3\"><span class=\"title\">" + mgs[0].name + "</span>&nbsp;</td><td class=\"progression\"></td></tr>");
    trHead.appendTo(where);
  }
  var nb = 0;
  var tot = 0;
  if (hasChanges) {
    //Add categories
    if (mgs[0].cats.length > 0) {
      for (var i = 0; i < mgs[0].cats.length; i++) {
        $("<div class='category include'>" + mgs[0].cats[i] + "</div>").appendTo($(".title", trHead).closest("td"));
      }
    }
  }
  for (var i = 0; i < mgs.length; i++) {
    if (mgs[i].change) {
      var mirroricon = getIcon(mgs[i].mirror);
      var trLine = $("<tr class=\"mangaentry body info" + (mgs[i].read == 1 ? " read" : (isNew(mgs[i]) ? " new": "")) + "\"><td class=\"empty\"></td><td class=\"checker\"><input type=\"checkbox\" checked=\"checked\"/></td><td class=\"mirroricon\"><a class=\"link\" onclick=\"openLink('" + mgs[i].url + "');\"><img src=\"" + mirroricon + "\" title=\"" + mgs[i].mirror + "\"/></a></td><td class=\"chapter\"><a class=\"chapter link\" onclick=\"openLink('" + mgs[i].lastChapterReadURL + "');\">" + mgs[i].lastChapterReadName+ "</a></td><td class=\"progression\"></td></tr>");
      trLine.appendTo(where);
      trLine.data("mangainfo", mgs[i]);
      createProgression(mgs[i].chapno, mgs[i].nbchaps, trLine);
    }
    nb += parseInt(mgs[i].chapno, 10);
    tot += parseInt(mgs[i].nbchaps, 10);
    
    if (mgs[i].change) {
      //Add change line
      var trUp = $("<tr class=\"mangaentry body modif" + (mgs[i].read == 1 ? " read" : (isNew(mgs[i]) ? " new": "")) + "\"><td class=\"empty\"></td><td colspan=\"4\"></td></tr>");
      buildModifs(getModifsText(mgs[i]), $("td", trUp).last());
      trUp.appendTo(where);
    }
  }
  if (hasChanges) {
    createProgression(nb, tot, trHead, true);
  }
  
  return {nbmg: mgs.length, nbchap: nb, chaptot: tot};
  
}

function addSingleManga(mg, where) {
  if (mg.change) {
    var mirroricon = getIcon(mg.mirror);
    var trSingle = $("<tr class=\"mangaentry single info" + (mg.read == 1 ? " read" : (isNew(mg) ? " new": "")) + "\"><td class=\"checker\"><input type=\"checkbox\" checked=\"checked\"/></td><td class=\"mirroricon\"><img src=\"" + mirroricon + "\" title=\"" + mg.mirror + "\"/></td><td class=\"chapter\" colspan=\"2\"><a class=\"title link\" onclick=\"openLink('" + mg.url + "');\">" + mg.name + "</a>&nbsp; - <a class=\"chapter link\" onclick=\"openLink('" + mg.lastChapterReadURL + "');\">" + mg.lastChapterReadName + "</a></td><td class=\"progression\"></td></tr>");
    trSingle.appendTo(where);
    trSingle.data("mangainfo", mg);
    createProgression(mg.chapno, mg.nbchaps, trSingle);
    //Add categories
    if (mg.cats.length > 0) {
      for (var i = mg.cats.length - 1; i >=0 ; i--) {
        $(".title", trSingle).after($("<div class='category include'>" + mg.cats[i] + "</div>"));
      }
    }
    //Add change line
    var trUp = $("<tr class=\"mangaentry body modif" + (mg.read == 1 ? " read" : (isNew(mg) ? " new": "")) + "\"><td colspan=\"5\"></td></tr>");
    buildModifs(getModifsText(mg), $("td", trUp));
    trUp.appendTo(where);
  }
  return {nbmg: 1, nbchap: mg.chapno, chaptot: mg.nbchaps};
}

function createProgression(nb, nbTot, where, hideText) {
  var value = 0;
  if (nb != nbTot) {
    if (nbTot < 2) {
      value = 100;
    } else {
      value = Math.floor((nbTot - 1 - nb) * 100 / (nbTot - 1));
    }
  }
  value = 100 - value;
  where = $(".progression", where);
  var prog = $("<div class=\"progress\"></div>");
  prog.appendTo(where);
  $(prog).progressbar({ "value": value });
  
  if (!hideText) {
    var text = $("<div class=\"progressnum\">&nbsp;" + value + "% (" + nb + " / " + nbTot + ")</div>");
    text.appendTo(where);
  } else {
    var text = $("<div class=\"progressnum\">&nbsp;" + value + "%</div>");
    text.appendTo(where);
  }
}

function getIcon(mirror) {
  for (var i = 0; i < icons.length; i++) {
    if (icons[i].mirror == mirror) {
      return icons[i].icon;
    }
  }
  return getIcon("all");
}

function buildModifs(modifs, where) {
  for (var i = 0; i < modifs.length; i++) {
    $("<div class=\"textModif\"><img src=\"" + modifs[i].button + "\"/>&nbsp;" + modifs[i].text + "</div>").appendTo(where);
  }
}
function getModifsText(mg) {
  var lstres = [];
  if (mg.change == "new") {
    lstres[lstres.length] = {button: "img/add.png", text: "This manga will be added in your list."};
  } else if (mg.change == "delete") {
    lstres[lstres.length] = {button: "img/cancel.png", text: "This manga will be deleted from your list."};
  } else {
    if (mg.updatemode) {
      for (var i = 0; i < mg.updatemode.length; i++) {
        if (mg.updatemode[i] == "chapter") {
          lstres[lstres.length] = {button: "img/update.png", text: "Your latest chapter read will be changed"};
        }
        if (mg.updatemode[i] == "newunread") {
          lstres[lstres.length] = {button: "img/update.png", text: "The total number of chapters will be updated."};
        }
        if (mg.updatemode[i] == "read") {
          lstres[lstres.length] = {button: "img/update.png", text: "Change reading mode (follow updates)"};
        }
        if (mg.updatemode[i] == "display") {
          lstres[lstres.length] = {button: "img/update.png", text: "Change display mode (right to left, left to right, on top)"};
        }
        if (mg.updatemode[i] == "cats") {
          lstres[lstres.length] = {button: "img/update.png", text: "Change categories"};
        }
      }
    }
  }
  return lstres;
}

//Send updates to server
function validateUpdateServer(callback) {
  var toSend = [];
  $(".mangaentry.info").each(function() {
    if ($(".checker input", $(this))[0].checked) {
      toSend[toSend.length] = $(this).data("mangainfo");
    }
  });
  
  $.ajax({
    url: "/updateList.php",
    type: 'POST',
    data: {
      listupdates: toSend,
      curTs: Math.round((new Date()).getTime() / 1000)
    },
    
    success: function(res) {
      var obj = JSON.parse(res);
      if (obj.errors && !obj.ts) {
        window.location.href = "/accountlist.php";
      } else {
        chrome.runtime.sendMessage({action: "siteUpdated", ts: obj.sync}, function() {
          window.location.href = "/accountlist.php";
        });
      }
    },
    
    error: function() {
      //TODO
    }
  });
}

//Update ext with server
function validateUpdateExt(callback) {
  var toSend = [];
  $(".mangaentry.info").each(function() {
    if ($(".checker input", $(this))[0].checked) {
      var tsT = $(this).data("mangainfo");
      tsT.ts = tsT.lastupdate;
      toSend[toSend.length] = tsT;
    }
  });
  
  //console.log(toSend);
  chrome.runtime.sendMessage({action: "updateFromSite", ts: tsacc, lst: toSend}, function() {
    window.location.href = "/accountlist.php?ext=1";
  });
}

//Upload
function replaceServerList(callback) {
  if (confirm("Are you sure to replace your online manga list with your local one ?")) {
    var toSend = [];
    chrome.runtime.sendMessage({action: "mangaList"}, function(res) {
      var exten = res.lst;
      setChapNoTot(exten);
      for (var i = 0; i < exten.length; i++) {
        var newentry = {};
        newentry.mirror = exten[i].mirror;
        newentry.url = exten[i].url;
        newentry.name = exten[i].name;
        newentry.lastChapterReadURL = exten[i].lastChapterReadURL;
        if (exten[i].lastChapterReadName != undefined) {
          newentry.lastChapterReadName = exten[i].lastChapterReadName;
        } else {
          newentry.lastChapterReadName = findRealName(exten[i]);
        }
        newentry.chapno = exten[i].chapno;
        newentry.nbchaps = exten[i].nbchaps;
        newentry.read = exten[i].read;
        newentry.display = exten[i].display;
        newentry.cats = exten[i].cats;
        newentry.lastupdate = exten[i].ts;
        
        newentry.change = "new";
        toSend[toSend.length] = newentry;
      }
      
      $.ajax({
        url: "/updateList.php",
        type: 'POST',
        data: {
          erase: "1",
          listupdates: toSend,
          curTs: Math.round((new Date()).getTime() / 1000)
        },
        
        success: function(res) {
          var obj = JSON.parse(res);
          if (obj.errors && !obj.ts) {
            window.location.href = "/accountlist.php";
          } else {
            chrome.runtime.sendMessage({action: "siteUpdated", ts: obj.sync}, function() {
              //console.log(obj);
              window.location.href = "/accountlist.php?act=up";
            });
          }
        },
        
        error: function() {
          //TODO
        }
      });
    });
  } else {
    callback();
  }
}

//Download
function replaceLocalList(callback) {
  if (confirm("Are you sure to replace your local manga list with the online one ?")) {
    var toSend = [];
    
    for (var i = 0; i < mglstacc.length; i++) {
      var complete = mglstacc[i];
      var nen = {};
      nen.mirror = complete.mirror;
      nen.name = complete.name;
      nen.url = complete.url;
      nen.lastChapterReadURL = complete.lastChapterReadURL;
      nen.lastChapterReadName = complete.lastChapterReadName;
      nen.read = complete.read;
      nen.display = complete.display;
      nen.cats = complete.cats;
      nen.ts = complete.lastupdate;
      
      nen.change = "new";
      toSend[toSend.length] = nen;
    }
    
    chrome.runtime.sendMessage({action: "replaceFromSite", ts: tsacc, lst: toSend}, function() {
      window.location.href = "/accountlist.php?act=down";
    });
  } else {
    callback();
  }
}

function onButtonClickAsync(button, call) {
  //Prevent a second request
  if (button.data("currentlyClicked")) return;
  button.data("currentlyClicked", true);
  
  //Display a loading image
  var _ancSrc;
  if (button.is(".button")) {
    button.addClass("disabled");
    _ancSrc = $("<img src='" + chrome.extension.getURL("img/ltload.gif") + "'></img>")
    _ancSrc.appendTo(button);
  }
  
  //Call the action with callback
  call(function() {
    if (button.is(".button")) {
      _ancSrc.remove();
      button.removeClass("disabled");
    }
    //Restore request
    button.removeData("currentlyClicked");
  });
}
