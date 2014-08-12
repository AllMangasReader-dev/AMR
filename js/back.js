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

var lastpresstime;
var dirpress;
var currentMirror = null;
var amrWhereScans;
var useLeftRightKeys = false;
var autoBookmarkScans = false;
var prefetchChapter = false;
var nextRight = false;
var idStat;
var timespent=0;
var starttime = new Date().getTime();
var updatetime = 10000;
var isActive = true;
var sendStats = false;
var times = [];
var debugTimes = false;
var timeoutAMRbar = 0;

function getMirrorScript() {
    "use strict";
    return currentMirror;
}

function removeBanner() {
  var obj = {};
  obj.action = "parameters";
  chrome.runtime.sendMessage(obj, function(response) {
    if (response.displayAds === 0) {
       getMirrorScript().removeBanners(document, window.location.href);
    }
  });
}

function initPage() {
  //console.log("initPage");
  if (getMirrorScript().isCurrentPageAChapterPage(document, window.location.href)) {
     setKeys();
     //console.log("found mirror for current page");
     chrome.runtime.sendMessage({"action": "parameters"}, function(response) {
        if (response.lrkeys == 1) {
          useLeftRightKeys = true;
        }
        if (response.autobm == 1) {
          autoBookmarkScans = true;
        }
        if (response.prefetch == 1) {
          prefetchChapter = true;
        }
        if (response.rightnext == 1) {
          nextRight = true;
        }
        if (response.sendstats == 1) {
          sendStats = true;
        }

        getMirrorScript().getInformationsFromCurrentPage(document, window.location.href, function(res) {
          jQuery.data(document.body, "curpageinformations", res);
          //console.log(res);
          //console.log(jQuery.data(document.body, "curpageinformations"));
          //console.log(res);
          chrome.runtime.sendMessage({action: "mangaInfos", url: res.currentMangaURL}, function(resp) {
            chrome.runtime.sendMessage({action: "barState"}, function(barState) {
              createDataDiv(res);
              if (response.displayChapters == 1) {
                var imagesUrl = getMirrorScript().getListImages(document, window.location.href);
                var select = getMirrorScript().getMangaSelectFromPage(document, window.location.href);
                var isSel = true;
                if (select === null) {
                  var selectIns = $("<select></select>");
                  selectIns.data("mangaCurUrl", res.currentChapterURL);
                  getMirrorScript().getListChaps(res.currentMangaURL, res.name, selectIns, callbackListChaps);
                  isSel = false;
                }
                getMirrorScript().doSomethingBeforeWritingScans(document, window.location.href);
                if (isSel) {
                  var whereNav;
                  if (response.newbar == 1) {
                    whereNav = createBar(barState.barVis);
                  } else {
                    whereNav = getMirrorScript().whereDoIWriteNavigation(document, window.location.href);
                  }

                  writeNavigation(whereNav, select, res, response);
                }
                var where = getMirrorScript().whereDoIWriteScans(document, window.location.href);
                amrWhereScans = where;
                $(document.body).data("amrparameters", response);
                //Get specific mode for currentManga
                var curmode = -1;
                if (resp !== null && resp.display) {
                  curmode = resp.display;
                }
                //If not use res.mode
                if (curmode == -1) {
                  curmode = response.displayMode;
                }
                writeImages(where, imagesUrl, curmode, response);
              }
              if (response.markwhendownload === 0 && (response.addauto == 1 || resp !== null)) {
                var obj = {"action": "readManga",
                           "url": res.currentMangaURL,
                           "mirror": getMirrorScript().mirrorName,
                           "lastChapterReadName": res.currentChapter,
                           "lastChapterReadURL": res.currentChapterURL,
                           "name": res.name};
                chrome.runtime.sendMessage(obj, function(response) {
                });
              } else {
                if (response.markwhendownload === 1 && (response.addauto === 1 || resp !== null)) {
                  jQuery.data(document.body, "sendwhendownloaded", {"action": "readManga",
                           "url": res.currentMangaURL,
                           "mirror": getMirrorScript().mirrorName,
                           "lastChapterReadName": res.currentChapter,
                           "lastChapterReadURL": res.currentChapterURL,
                           "name": res.name});
                }
              }
              if (sendStats) {
                var statobj = {"action": "readMgForStat",
                           "url": res.currentMangaURL,
                           "mirror": getMirrorScript().mirrorName,
                           "lastChapterReadName": res.currentChapter,
                           "lastChapterReadURL": res.currentChapterURL,
                           "name": res.name};
                chrome.runtime.sendMessage(statobj, function(response) {
                  idStat = response.id;
                  bindCalculateTime();
                  setTimeout(function() {
                    updateStat(true);
                  }, updatetime);
                });
              }
            });
          });
        });
      });
  }
}

function bindCalculateTime() {
  window.onbeforeunload = function() {
    if (isActive) {
      var now = new Date().getTime();
      if (debugTimes) times[times.length] = now - starttime;
      timespent += now - starttime;
      starttime = now;
    }
    updateStat();
    if (debugTimes) {
      var res = "";
      for (var i = 0; i < times.length; i++) {
        res += times[i] + ", ";
      }
      res += " --> " + timespent;
      return res;
    }
  };
  $(window).focus(function() {
    starttime = new Date().getTime();
    isActive = true;
  });
  $(window).blur(function() {
    var now = new Date().getTime();
    if (debugTimes) times[times.length] = now - starttime;
    timespent += now - starttime;
    starttime = now;

    isActive = false;
  });
}

function updateStat(estimated) {
  estimated = estimated || false;
  var tosend = timespent;
  if (estimated) {
    if (isActive) {
      tosend += new Date().getTime() - starttime;
    }
  }
  var statobj = {"action": "updateMgForStat",
             "id": idStat,
             "time_spent": tosend};
  if (sendStats) {
    chrome.runtime.sendMessage(statobj, function(response) {});
  }
  setTimeout(updateStat, updatetime);
}

function createBar(barVis) {
  var div = $("<div id='AMRBar'></div>");
  var divIn = $("<div id='AMRBarIn'></div>");

  var img = $("<img src='" + chrome.extension.getURL("img/icon-32.png") + "' width='20px;'/>");
  img.appendTo(divIn);
  var divContent = $("<div></div>");
  divContent.appendTo(divIn);
  divContent.css("display", "inline-block");

  var divBottom = $("<div></div>");
  divBottom.css("display", "inline-block");
  var imgBtn = $("<img src='" + chrome.extension.getURL("img/down.png") + "' width='16px;' title='Hide AMR Toolbar'/>");
  imgBtn.appendTo(divBottom);
  imgBtn.click(function() {
    chrome.runtime.sendMessage({action: "hideBar"}, function(response) {
      if (response.res == 1) {
        if ($("#AMRBarIn").data("temporary")) {
          $("#AMRBarIn").removeData("temporary");
          if (timeoutAMRbar !== 0) {
            clearTimeout(timeoutAMRbar);
          }
        }
        $("#AMRBarInLtl").fadeOut('fast', function() {
          $("#AMRBar").css("text-align", "center");
          $("#AMRBarIn").fadeIn();
        });
      } else {
        $("#AMRBarIn").fadeOut('fast', function() {
          $("#AMRBar").css("text-align", "left");
          $("#AMRBarInLtl").fadeIn(function() {
            $(this).css("display", "inline-block");
          });
        });
      }
    });

  });

  div.mouseenter(function() {
    if (timeoutAMRbar !== 0) {
      clearTimeout(timeoutAMRbar);
    }
    if (!$("#AMRBarIn", $(this)).is(":visible")) {
      $("#AMRBarIn").data("temporary", true);
      $("#AMRBarInLtl").fadeOut('fast', function() {
        $("#AMRBar").css("text-align", "center");
        $("#AMRBarIn").fadeIn();
      });
    }
  });

  div.mouseleave(function() {
    if ($("#AMRBarIn").data("temporary")) {
      if (timeoutAMRbar !== 0) {
        clearTimeout(timeoutAMRbar);
      }
      timeoutAMRbar = setTimeout(function() {
        $("#AMRBarIn").removeData("temporary");
        $("#AMRBarIn").fadeOut('fast', function() {
          $("#AMRBar").css("text-align", "left");
          $("#AMRBarInLtl").fadeIn(function() {
            $(this).css("display", "inline-block");
          });
        });
      }, 2000);
    }
  });

  divBottom.appendTo(divIn);

  var divInLtl = $("<div id='AMRBarInLtl'></div>");
  divInLtl.css("display", "inline-block");

  var imgLtl = $("<img src='" + chrome.extension.getURL("img/icon-32.png") + "' width='40px;' title='Display AMR ToolBar'/>");
  imgLtl.css("margin-top", "-10px");
  imgLtl.css("margin-left", "-10px");
  imgLtl.css("cursor", "pointer");

  imgLtl.appendTo(divInLtl);
  imgLtl.click(function() {
    $("#AMRBarInLtl").fadeOut('fast', function() {
      $("#AMRBar").css("text-align", "center");
      $("#AMRBarIn").fadeIn();
      chrome.runtime.sendMessage({action: "showBar"}, function(response) {});
    });
  });

  divIn.css("display", "inline-block");
  divIn.appendTo(div);
  divInLtl.appendTo(div);

  div.appendTo($(document.body));
  $(document.body).css("border-top", "34px solid black");
  $(document.body).css("background-position-y", "34px");


  //console.log("BARVIS : " + barVis);
  if (barVis == 0) {
    $("#AMRBar").css("text-align", "left");
    $("#AMRBarIn").hide();
  } else {
    $("#AMRBar").css("text-align", "center");
    $("#AMRBarInLtl").hide();
  }
  return divContent;
}

function showDialog(dialog) {
  var textDesc;
  if ($("#bookmarkData").data("type") == "chapter") {
    textDesc = "Bookmark chapter '" + $("#bookmarkData").data("chapName") + "' of '" + $("#bookmarkData").data("name") + "' on '" + $("#bookmarkData").data("mirror");
    textDesc += "'. You can add notes below which will be associated with this bookmark.";
  } else {
    textDesc = "Bookmark scan '" + $("#bookmarkData").data("scanName") + "' of chapter '" + $("#bookmarkData").data("chapName") + "' of '" + $("#bookmarkData").data("name") + "' on '" + $("#bookmarkData").data("mirror");
    textDesc += "'. You can add notes below which will be associated with this bookmark.";
  }
  $("#bookmarkPop #descEltAMR").text(textDesc);
}

function createDataDiv(res) {
  //Create modal form for bookmarks
  var divData = $("<div id='bookmarkData' style='display:none'></div>");
  $("<span>This div is used to store data for AMR</span>").appendTo(divData);
  divData.appendTo($(document.body));
  divData.data("mirror", getMirrorScript().mirrorName);
  divData.data("url", res.currentMangaURL);
  divData.data("chapUrl", res.currentChapterURL);
  divData.data("name", res.name);
  divData.data("chapName", res.currentChapter);
}
function add_bookmark_button () {
    "use strict";
    var obj = {
        action: "addUpdateBookmark",
        mirror: $("#bookmarkData").data("mirror"),
        url: $("#bookmarkData").data("url"),
        chapUrl: $("#bookmarkData").data("chapUrl"),
        type: $("#bookmarkData").data("type"),
        name: $("#bookmarkData").data("name"),
        chapName: $("#bookmarkData").data("chapName"),
        note: $("#noteAMR").val()
    };
    if ($("#bookmarkData").data("type") !== "chapter") {
        obj.scanUrl = $("#bookmarkData").data("scanUrl");
        obj.scanName = $("#bookmarkData").data("scanName");
        var imgScan = $(".spanForImg img[src='" + obj.scanUrl + "']");
        imgScan.css("border-color", "#999999");
        if ($("#noteAMR").val() !== "") {
            imgScan.attr("title", "Note : " + $("#noteAMR").val());
        }
        imgScan.data("note", $("#noteAMR").val());
        imgScan.data("booked", true);
    } else {
        $("#bookmarkData").data("note", $("#noteAMR").val());
        if ($("#noteAMR").val() !== "") {
            $(".bookAMR").attr("title", "Note : " + $("#noteAMR").val());
        }
        $(".bookAMR").attr("src", chrome.extension.getURL("img/bookmarkred.png"));
        $("#bookmarkData").data("chapbooked", true);
    }

    chrome.runtime.sendMessage(obj, function () {});
    $.modal.close();
}
function delete_bookmark_button () {
    "use strict";
    var obj = {
        action: "deleteBookmark",
        mirror: $("#bookmarkData").data("mirror"),
        url: $("#bookmarkData").data("url"),
        chapUrl: $("#bookmarkData").data("chapUrl"),
        type: $("#bookmarkData").data("type")
    };
    if ($("#bookmarkData").data("type") !== "chapter") {
        obj.scanUrl = $("#bookmarkData").data("scanUrl");
        var imgScan = $(".spanForImg img[src='" + obj.scanUrl + "']");
        imgScan.css("border-color", "white");
        imgScan.removeAttr("title");
        imgScan.removeData("booked");
    } else {
        $(".bookAMR").removeAttr("title");
        $(".bookAMR").attr("src", chrome.extension.getURL("img/bookmark.png"));
        $("#bookmarkData").removeData("chapbooked");
    }

    chrome.runtime.sendMessage(obj, function () {});
    $.modal.close();
}
function writeNavigation(where, select, res, params) {
    "use strict";
    var div = $("<div id='bookmarkPop' style='display:none'></div>"),
        btn = $("<a id='saveBtnAMR' class='buttonAMR'>Save</a>");
    $("<h3>Bookmark</h3>").appendTo(div);
    $("<div id='descEltAMR'></div>").appendTo(div);
    $("<table><tr><td style='vertical-align:top'><b>Note:</b></td><td><textarea id='noteAMR' cols='50' rows='5' /></td></tr></table>").appendTo(div);

    btn.click(add_bookmark_button);

    var btndel = $("<a id='delBtnAMR' class='buttonAMR'>Delete Bookmark</a>");
    btndel.click(delete_bookmark_button);
    btndel.appendTo(div);
    btn.appendTo(div);

    var divTip = $("<div id='tipBMAMR'></div>");
    $("<span>To bookmark a scan, right click on it and choose 'Bookmark in AMR'.</span><br /><span>To manage bookmarks, go to </span>").appendTo(divTip);
    var aBMPage = $("<a href='#'>AMR Bookmark Page</a>");
    aBMPage.click(function () {
        chrome.runtime.sendMessage({
            action: "opentab",
            url: "/bookmarks.html"
        }, function (resp) {});
    });
    aBMPage.appendTo(divTip);
    divTip.appendTo(div);
    div.appendTo($(document.body));

    where.empty();
    where.each(function (index) {
        var selectIns;

        selectIns = $(select).clone();
        $(selectIns).css("float", "none");
        $(selectIns).css("max-width", $(document).width() - 450 + "px");
        selectIns.attr("value", $(select).children("option:selected").val());

        selectIns.change(function () {
            window.location.href = $("option:selected", $(this)).val();
        });

        var prevUrl = getMirrorScript().previousChapterUrl(selectIns, document, window.location.href);
        if (prevUrl !== null) {
            var aprev = $("<a id='pChapBtn" + index + "' class='buttonAMR' href='" + prevUrl + "'>Previous</a>");
            aprev.appendTo(this);
        }

        selectIns.appendTo(this);

        var nextUrl = getMirrorScript().nextChapterUrl(selectIns, document, window.location.href);
        if (nextUrl !== null) {
            var anext = $("<a id='nChapBtn" + index + "' class='buttonAMR' href='" + nextUrl + "'>Next</a>");
            anext.appendTo(this);
            jQuery.data(document.body, "nexturltoload", nextUrl);
        }

        //Add bookmark functionality
        var book = $("<img class='bookAMR' src='" + chrome.extension.getURL("img/bookmark.png") + "'/>");
        book.appendTo(this);
        book.click(function () {
            $("#bookmarkData").data("type", "chapter");
            $("#noteAMR").val($("#bookmarkData").data("note"));
            if ($("#bookmarkData").data("chapbooked")) {
                $("#delBtnAMR").show();
            } else {
                $("#delBtnAMR").hide();
            }

            $("#bookmarkPop").modal({
                focus: false,
                onShow: showDialog,
                zIndex: 10000000
            });

        });
        if (index === 0) {
            var objBM = {
                action: "getBookmarkNote",
                mirror: getMirrorScript().mirrorName,
                url: res.currentMangaURL,
                chapUrl: res.currentChapterURL,
                type: "chapter"
            };
            chrome.runtime.sendMessage(objBM, function (result) {
                if (!result.isBooked) {
                    $("#bookmarkData").data("note", "");
                    $(".bookAMR").attr("title", "Click here to bookmark this chapter");
                } else {
                    $("#bookmarkData").data("note", result.note);
                    if (result.note !== "") $(".bookAMR").attr("title", "Note : " + result.note);
                    $("#bookmarkData").data("chapbooked", true);
                    $(".bookAMR").attr("src", chrome.extension.getURL("img/bookmarkred.png"));
                }
            });
        }

        //Get specific read for currentManga
        var _self = this;
        chrome.runtime.sendMessage({
            action: "mangaInfos",
            url: res.currentMangaURL
        }, function (resp) {
            var isRead = (resp === null ? false : (resp.read == 1));
            var imgread = $("<img class='butamrread' src='" + chrome.extension.getURL("img/" + (!isRead ? "read_stop.png" : "read_play.png")) + "' title='" + (!isRead ? "Stop following updates for this manga" : "Follow updates for this manga") + "' />");
            if (resp === null && params.addauto === 0) {
                imgread.hide();
            }
            imgread.appendTo(_self);
            imgread.data("mangaurl", res.currentMangaURL);

            imgread.click(function () {
                var curRead = ($(this).attr("src") == chrome.extension.getURL("img/read_play.png"));
                var obj = {
                    action: "markReadTop",
                    url: $(this).data("mangaurl"),
                    read: (curRead ? 0 : 1),
                    updatesamemangas: true
                };

                var _but = this;
                sendExtRequest(obj, $(this), function () {
                    if (curRead) {
                        $(_but).attr("src", chrome.extension.getURL("img/read_stop.png"));
                        $(_but).attr("title", "Stop following updates for this manga");
                    } else {
                        $(_but).attr("src", chrome.extension.getURL("img/read_play.png"));
                        $(_but).attr("title", "Follow updates for this manga");
                    }
                }, false);
            });


            //Get specific mode for currentManga
            var curmode = -1;
            if (resp !== null && resp.display) {
                curmode = resp.display;
            }
            //If not use res.mode
            if (curmode == -1) {
                curmode = params.displayMode;
            }
            //mode = 1 --> images are displayed on top of one another
            //mode = 2 --> images are displayed two by two occidental reading mode
            //mode = 3 --> images are displayed two by two japanese reading mode
            var imgmode = $("<img src='" + chrome.extension.getURL("img/" + ((curmode == 1) ? "ontop.png" : ((curmode == 2) ? "righttoleft.png" : "lefttoright.png"))) + "' title='" + ((curmode == 1) ? "Scans displayed on top of each other (click to switch display mode for this manga only)" : ((curmode == 2) ? "Scans displayed as a book in occidental mode (left to right) (click to switch display mode for this manga only)" : "Scans displayed as a book in japanese mode (right to left) (click to switch display mode for this manga only)")) + "' />");
            imgmode.appendTo(_self);
            imgmode.data("curmode", curmode);
            imgmode.data("mangaurl", res.currentMangaURL);
            imgmode.click(function () {
                var md = $(this).data("curmode");
                var mdnext = (md % 3) + 1;
                var obj = {
                    action: "setDisplayMode",
                    url: $(this).data("mangaurl"),
                    display: mdnext
                };
                var _butMode = this;
                sendExtRequest(obj, $(this), function () {
                    $(_butMode).data("curmode", mdnext);
                    transformImagesInBook(amrWhereScans, mdnext, $(document.body).data("amrparameters"));
                    if (mdnext == 1) {
                        $(_butMode).attr("src", chrome.extension.getURL("img/ontop.png"));
                        $(_butMode).attr("title", "Scans displayed on top of each other (click to switch display mode for this manga only)");
                    } else if (mdnext == 2) {
                        $(_butMode).attr("src", chrome.extension.getURL("img/righttoleft.png"));
                        $(_butMode).attr("title", "Scans displayed as a book in occidental mode (left to right) (click to switch display mode for this manga only)");
                    } else {
                        $(_butMode).attr("src", chrome.extension.getURL("img/lefttoright.png"));
                        $(_butMode).attr("title", "Scans displayed as a book in japanese mode (right to left) (click to switch display mode for this manga only)");
                    }
                }, false);
            });

            var imgstop = $("<img class='butamrstop' src='" + chrome.extension.getURL("img/stop.gif") + "' title='Mark this chapter as latest chapter read' />");
            if (resp === null && params.addauto === 0) {
                imgstop.hide();
            }
            imgstop.appendTo(_self);
            imgstop.data("mangainfo", res);

            imgstop.click(function () {
                var ret = confirm("This action will reset your reading state for this manga and this chapter will be considered as the latest you have read. Do you confirm this action ?");
                if (ret) {
                    var obj = {
                        "action": "setMangaChapter",
                        "url": $(this).data("mangainfo").currentMangaURL,
                        "mirror": getMirrorScript().mirrorName,
                        "lastChapterReadName": $(this).data("mangainfo").currentChapter,
                        "lastChapterReadURL": $(this).data("mangainfo").currentChapterURL,
                        "name": $(this).data("mangainfo").name
                    };
                    sendExtRequest(obj, $(this), function () {}, true);
                }
            });

            if (params.addauto === 0 && resp === null) {
                var imgadd = $("<img src='" + chrome.extension.getURL("img/add.png") + "' title='Add this manga to your reading list' />");
                imgadd.appendTo(_self);
                imgadd.data("mangainfo", res);

                imgadd.click(function () {
                    var obj = {
                        "action": "readManga",
                        "url": $(this).data("mangainfo").currentMangaURL,
                        "mirror": getMirrorScript().mirrorName,
                        "lastChapterReadName": $(this).data("mangainfo").currentChapter,
                        "lastChapterReadURL": $(this).data("mangainfo").currentChapterURL,
                        "name": $(this).data("mangainfo").name
                    };
                    var _butadd = this;
                    sendExtRequest(obj, $(this), function () {
                        $(".butamrstop").show();
                        $(".butamrread").show();
                        $(_butadd).remove();
                    }, true);
                });
            }

            $(_self).addClass("amrbarlayout");

            //TODO : change pub !!! (facebook + donate)...
            if (params.pub == 1) {
                var linkPub = $("<div class=\"titleAMRPub\"></div>");
                var linkP2 = $("<span>You like reading your mangas this way with All Mangas Reader Extension, please donate !!&nbsp;&nbsp;</span><form action=\"https://www.paypal.com/cgi-bin/webscr\" method=\"post\" style='display:inline-block;'><input type=\"hidden\" name=\"cmd\" value=\"_s-xclick\"><input type=\"hidden\" name=\"hosted_button_id\" value=\"7GQN3EZ6KK5MU\"><input type=\"image\" src=\"https://www.paypalobjects.com/WEBSCR-640-20110429-1/en_US/i/btn/btn_donate_SM.gif\" border=\"0\" name=\"submit\" alt=\"PayPal - The safer, easier way to pay online!\"><img alt=\"\" border=\"0\" src=\"https://www.paypalobjects.com/WEBSCR-640-20110429-1/en_US/i/scr/pixel.gif\" width=\"1\" height=\"1\"></form>");
                linkP2.css("vertical-align", "middle");
                linkP2.css("color", "red!important");
                /*linkP2.click(function() {
                  chrome.runtime.sendMessage({action: "openExtensionMainPage"}, function(response) {});
                });*/
                linkP2.appendTo(linkPub);
                var deletePub = $("<img src=\"" + chrome.extension.getURL("img/cancel.png") + "\" />");
                deletePub.attr("title", "Remove this banner...");
                deletePub.css("cursor", "pointer");
                deletePub.css("vertical-align", "middle");
                deletePub.css("margin-left", "10px");
                deletePub.click(function () {
                    chrome.runtime.sendMessage({
                        action: "deletepub"
                    }, function (response) {
                        $(".titleAMRPub").remove();
                    });
                });
                deletePub.appendTo(linkPub);
                linkPub.appendTo(_self);
            }
            var whereNavToTrail = getMirrorScript().whereDoIWriteNavigation(document, window.location.href);
            addTrailingLastChap($(whereNavToTrail).last());
        });
    });
}

//Used to request background page action
function sendExtRequest(request, button, callback, backsrc) {
  //Prevent a second request
  if (button.data("currentlyClicked")) return;
  button.data("currentlyClicked", true);

  //Display a loading image
  var _ancSrc;
  if (button.is("img")) {
    _ancSrc = button.attr("src");
    button.attr("src", chrome.extension.getURL("img/load16.gif"));
  } else {
    if (button.is(".button")) {
      _ancSrc = $("<img src='" + chrome.extension.getURL("img/ltload.gif") + "'></img>");
      _ancSrc.appendTo(button);
    }
    if (button.is(".category") || button.is(".mgcategory")) {
      _ancSrc = $("<img src='" + chrome.extension.getURL("img/load10.gif") + "'></img>");
      _ancSrc.appendTo(button);
    }
  }
  //Call the action
  chrome.runtime.sendMessage(request, function() {
  //setTimeout(function() {
    //Do the callback
    callback();
    //Removes the loading image
    if (button.is("img")) {
      if (backsrc) {
        button.attr("src", _ancSrc);
      }
    } else {
      if (button.is(".button") || button.is(".category") || button.is(".mgcategory")) {
        _ancSrc.remove();
      }
    }
    //Restore request
    button.removeData("currentlyClicked");
  //}, 1000);
  });
}

function callbackListChaps(list, select) {
  var hasSelected = false;
  for (var j = 0; j < list.length; j++) {
      var optTmp = $("<option value=\"" + list[j][1] + "\">" + list[j][0] + "</option>");
    if ($(select).data("mangaCurUrl").indexOf(list[j][1]) != - 1 && !hasSelected) {
      optTmp.attr("selected", true);
      if ($(select).data("mangaCurUrl") == list[j][1]) {
        hasSelected = true;
      }
    }
    optTmp.appendTo($(select));
  }

  chrome.runtime.sendMessage({"action": "parameters"}, function(response) {
      var whereNav;
      if (response.newbar == 1) {
        chrome.runtime.sendMessage({action: "barState"}, function(barState) {
          whereNav = createBar(barState.barVis);
          writeNavigation(whereNav, select, jQuery.data(document.body, "curpageinformations"), response);
        });
      } else {
        whereNav = getMirrorScript().whereDoIWriteNavigation(document, window.location.href);
        writeNavigation(whereNav, select, jQuery.data(document.body, "curpageinformations"), response);
      }
  });
}

function addTrailingLastChap(where) {
  if ($("#nChapBtn0").size() === 0) {
    $("<div style=\"width:100%; background-color:white; border-radius:5px;margin-top:15px;margin-bottom:15px;\"><img src=\"" + chrome.extension.getURL("img/warn.png") + "\" style=\"vertical-align:middle;margin-right:10px;\"/><span style=\"font-weight:bold;font-size:12pt;color:black;vertical-align:middle;\">This is the latest published chapter !</span></div>").appendTo(where);
  }
}

function onLoadImage() {
  if ($(this).data("canvasId")) {
    var width, height;
    var ancCan = $("#" + $(this).data("canvasId"));

    var resize = $(this).data("resize");
    var mode = $(this).data("modedisplay");

    if (resize == 1) {
      if (ancCan.width() < ancCan.height()) {
        if (mode != 1) {
          if (ancCan.width() > (screen.width-200) / 2) {
            width = (screen.width-200) / 2;
          } else {
            width = ancCan.width();
          }
        } else {
          if (ancCan.width() > (screen.width-200)) {
            width = (screen.width-200);
          } else {
            width = ancCan.width();
          }
        }
      } else {
        if (ancCan.width() > (screen.width-200)) {
          width = (screen.width-200);
        } else {
          width = ancCan.width();
        }
      }
    } else {
      width = ancCan.width();
    }
    height = (width / ancCan.width()) * ancCan.height();

    //DIV VERSION
    $("div", ancCan).add($("div > img", ancCan)).each(function(index) {
      //FIX CONFLICT WITH AdBlock -->
      var wori = $(this).width();
      if (wori === 0) {
        //console.log("zero width img to " + $(this).data("width"));
        wori = $(this).data("width");
      }
      var hori = $(this).height();
      if (hori === 0) {
        //console.log("zero height img to " + $(this).data("height"));
        hori = $(this).data("height");
      }
      //---
      var w = Math.floor((width / ancCan.width()) * wori) + 1;
      var h = Math.floor((width / ancCan.width()) * hori) + 1;

      $(this).css("width", w + 'px');
      $(this).css("height", h + 'px');
      if ($(this).css("position") == "absolute") {
        var l = Math.floor((width / ancCan.width()) * $(this).position().left);
        if (l !== 0) l++;
        var t = Math.floor((width / ancCan.width()) * $(this).position().top);
        if (t!== 0) t++;
        $(this).css("left", l + 'px');
        $(this).css("top", t + 'px');
      }
    });

    $(ancCan).css("width", width + 'px');
    $(ancCan).css("height", height + 'px');

    $(ancCan).css("margin-bottom", "50px");
    $(ancCan).css("border", "5px solid white");
    $("#" + $(this).data("divLoad")).css("display", "none");
    $(this).data("finish", "1");
    $(this).css("display", "none");

    //Bookmark DIV MOD ??? TODO
  } else {
    $("#" + $(this).data("divLoad")).css("display", "none");
    $(this).data("finish", "1");
    $(this).css("margin-right", "10px");
    if ($(this).attr("src") != chrome.extension.getURL("img/imgerror.png")) {
      $(this).css("border", "5px solid white");
      $(this).css("margin-bottom", "50px");
    }

    //Create contextual menu to bookmark image
    chrome.runtime.sendMessage({
      action: "createContextMenu",
      lstUrls: [ $(this).attr("src") ]
    }, function(resp) {});
    //Check bookmarks
    var objBM = {
      action: "getBookmarkNote",
      mirror: $("#bookmarkData").data("mirror"),
      url: $("#bookmarkData").data("url"),
      chapUrl: $("#bookmarkData").data("chapUrl"),
      type: "scan",
      scanUrl: $(this).attr("src"),
      scanName: $(this).data("idScan")};
    chrome.runtime.sendMessage(objBM, function(result) {
      if (result.isBooked) {
        var imgScan = $(".spanForImg img[src='" + result.scanSrc + "']");
        if (imgScan.size() === 0) {
          imgScan = $(".spanForImg img[src='" + decodeURI(result.scanSrc) + "']");
        }
        imgScan.data("note", result.note);
        imgScan.data("booked", 1);
        if (result.note !== "") imgScan.attr("title", "Note : " + result.note);
        imgScan.css("border-color", "#999999");
      }
    });
    if (autoBookmarkScans) {
      $(this).dblclick(function() {
        var obj;
        if ($(this).data("booked")) {
          obj = {
            action: "deleteBookmark",
            mirror: $("#bookmarkData").data("mirror"),
            url: $("#bookmarkData").data("url"),
            chapUrl: $("#bookmarkData").data("chapUrl"),
            type: "scan"
          };
          obj.scanUrl = $(this).attr("src");

          $(this).css("border-top-color", "white");
          $(this).css("border-right-color", "white");
          $(this).css("border-bottom-color", "white");
          $(this).css("border-left-color", "white");
          $(this).removeAttr("title");
          $(this).removeData("booked");
          $(this).removeData("note");

          chrome.runtime.sendMessage(obj, function(resp) {});
        } else {
          obj = {
            action: "addUpdateBookmark",
            mirror: $("#bookmarkData").data("mirror"),
            url: $("#bookmarkData").data("url"),
            chapUrl: $("#bookmarkData").data("chapUrl"),
            type: "scan",
            name: $("#bookmarkData").data("name"),
            chapName: $("#bookmarkData").data("chapName")
          };
          obj.scanUrl = $(this).attr("src");
          obj.scanName = $(this).data("scanName");
          obj.note = "";

          $(this).css("border-color", "#999999");
          $(this).data("note", "");
          $(this).data("booked", 1);

          chrome.runtime.sendMessage(obj, function(resp) {});
        }
      });
    }
  }
  var divNum = $("<div class='pagenumberAMR'><div class='number'>" + ($(this).data("idScan") + 1) + "</div></div>");
  divNum.appendTo($(this).closest(".spanForImg"));
}



function clickOnBM(src) {
  var imgScan = $(".spanForImg img[src='" + src + "']");
  if (imgScan.size() === 0) {
    imgScan = $(".spanForImg img[src='" + decodeURI(src) + "']");
  }

  $("#bookmarkData").data("type", "scan");
  $("#bookmarkData").data("scanUrl", src);
  $("#bookmarkData").data("scanName", imgScan.data("idScan"));

  if (imgScan.data("note") !== undefined) {
    $("#noteAMR").val(imgScan.data("note"));
  } else {
    $("#noteAMR").val("");
  }
  if (imgScan.data("booked")) {
    $("#delBtnAMR").show();
  } else {
    $("#delBtnAMR").hide();
  }

  $("#bookmarkPop").modal({focus:false, onShow: showDialog, zIndex:10000000});

}

function onErrorImage() {
  $(this).css("margin-bottom", "50px");
  $(this).css("margin-right", "10px");
  if (this.naturalWidth === 0) {
    //Here, number of tries before considering image can not be loaded
    if ($(this).data("number") == 2) {
        console.log("Image has not been recovered");
        $(this).attr("src", chrome.extension.getURL("img/imgerror.png"));
        $(this).css("border", "0");
        $(this).css("margin", "0");
        $(this).data("finish", "1");
        $("#" + $(this).data("divLoad")).css("display", "none");

        //Create the reload button
        var butReco = $("<a class='buttonAMR'>Try to reload</a>");
        butReco.css("display", "block");
        butReco.css("max-width", "200px");
        butReco.css("margin-left", "auto");
        butReco.css("margin-right", "auto");
        $(this).after(butReco);
        butReco.click(function() {
          var imgAnc = $(this).prev();
          var url = $(imgAnc).data("urlToLoad");
          var divLoadId = $(imgAnc).data("divLoad");
          var idScan = $(imgAnc).data("idScan");
          var spanner = $(this).parent();
          spanner.empty();

          var img = new Image();
          //== loadImage
          $(img).data("urlToLoad", url);
          $(img).css("border", "5px solid white");
          $(img).load(onLoadImage);
          $(img).error(onErrorImage);
          getMirrorScript().getImageFromPageAndWrite(url, img, document, window.location.href);

          $(img).appendTo(spanner);

          var div = $("<div id='" + divLoadId + "' class='divLoading'></div>");
          div.css("background", "url(" + chrome.extension.getURL("img/loading.gif") + ") no-repeat center center");
          $(img).data("divLoad", divLoadId);
          $(img).data("idScan", idScan);
          div.appendTo(spanner);
        });

    } else {
      //console.log("An image has encountered a problem while loading... All Mangas Reader is trying to recover it...");
      var imgSave = new Image();

      if ($(this).data("hasErrors") != "1") {
        $(imgSave).data("hasErrors", "1");
        $(imgSave).data("number", 1);
      } else {
        $(imgSave).data("hasErrors", "1");
        $(imgSave).data("number", $(this).data("number") + 1);
      }

      $(imgSave).data("divLoad", $(this).data("divLoad"));
      $(imgSave).data("idScan", $(this).data("idScan"));

      //== loadImage
      $(imgSave).data("urlToLoad", $(this).data("urlToLoad"));
      $(imgSave).css("border", "5px solid white");
      $(imgSave).load(onLoadImage);
      $(imgSave).error(onErrorImage);
      getMirrorScript().getImageFromPageAndWrite($(this).data("urlToLoad"), imgSave, document, window.location.href);

      $(this).after($(imgSave));
      $(this).remove();
    }
  } else {
    $("#" + $(this).data("divLoad")).css("display", "none");
    $(this).data("finish", "1");
    $(this).data("error", "1");
  }
}

function loadImageAMR(where, url, img, pos, res, mode, second) {
  if (!second) {
    $(img).data("urlToLoad", url);
    $(img).data("resize", res.resize);
    $(img).data("modedisplay", mode);

    $(img).load(onLoadImage);
    $(img).error(onErrorImage);
  }

  if (res.imgorder == 1) {
    if (nbLoaded(where) == pos) {
      getMirrorScript().getImageFromPageAndWrite(url, img, document, window.location.href);
    } else {
      setTimeout(function() {
        loadImageAMR(where, url, img, pos, res, mode, true);
      }, 100);
    }
  } else {
    getMirrorScript().getImageFromPageAndWrite(url, img, document, window.location.href);
  }
}

function writeImages(where, list, mode, res) {
   var table = $("<table class='AMRtable'></table>");
   table.css("text-align", "center");
   table.css("position", "static");
   table.css("width", "100%");
   table.appendTo(where);

   for (var i = 0; i < list.length; i++) {
    var tr = $("<tr></tr>");
    tr.appendTo(table);
    var td = $("<td></td>");
    td.css("text-align", "center");
    td.appendTo(tr);

    var spanner = $("<div class='spanForImg'></div>");
    $(spanner).css("vertical-align", "middle");
    $(spanner).css("text-align", "center");
    $(spanner).data("order", i);
    spanner.appendTo(td);

    var div = $("<div id='loader" + i + "' class='divLoading'></div>");
    div.css("background", "url(" + chrome.extension.getURL("img/loading.gif") + ") no-repeat center center");
    div.appendTo(spanner);
    
    // Using jQuery to create this image instead of DOM native method fix a
    //weird bug on canary and only some websites.
    //My thought is that a version of canary was mistaking the embedded jQuery
    //on the website and when the extension creates image from DOM and container
    //from website's jQuery. We can't have both of them interract (DOM restriction)
    //It might be a Canary issue more than an AMR issue... Here it is fixed...
    var img = new Image();

    $(img).addClass("imageAMR");
    $(img).data("owidth", img.offsetWidth);
    $(img).data("divLoad", "loader" + i);
    $(img).data("idScan", i);
    loadImageAMR(where, list[i], img, i, res, mode);
    $(img).appendTo(spanner);
   }

   var title = $("title").text();
   waitForImages(where, mode, res, title);
}

function nbLoaded(where) {
  var nbOk = 0;
  $(".imageAMR", where).each(function (index) {
    if ($(this).data("finish") == "1") {
      nbOk++;
    }
  });
  return nbOk;
}

function waitForImages(where, mode, res, title){
  isOk = true;
  var nbOk = 0;
  var nbTot = 0;
  $(".imageAMR", where).each(function (index) {
    if ($(this).data("finish") != "1") {
      isOk = false;
    } else {
      nbOk++;
    }
    if (this.offsetWidth != $(this).data("owidth")) {
      $("#" + $(this).data("divLoad")).css("display", "none");
    }
    nbTot++;
  });
  if (res.load == 1) {
    if (nbTot !== 0) {
      $("title").text(Math.floor(nbOk / nbTot * 100) + " % - " + title);
    }
  }
  if (isOk) {
    //console.log("finish loading images");
    transformImagesInBook(where, mode, res);
    getMirrorScript().doAfterMangaLoaded(document, window.location.href);
    $("title").text(title);
    if (jQuery.data(document.body, "nexturltoload") && prefetchChapter) {
      loadNextChapter(jQuery.data(document.body, "nexturltoload"));
    }

    if (jQuery.data(document.body, "sendwhendownloaded")) {
      chrome.runtime.sendMessage(jQuery.data(document.body, "sendwhendownloaded"), function(response) {
      });
    }

  } else {
    setTimeout(function() {
      waitForImages(where, mode, res, title);
    }, 500);
  }
}

function isLandscape(img) {
  if ($(img).data("canvasId")) {
    var can = $("#" + $(img).data("canvasId"));
    //console.log("landscape : " + can.width() + " --> " + can.height());
    return can.width() > can.height();
  } else {
    //console.log("probleme...");
    if (parseInt($(img).css("width"), 10) > parseInt($(img).css("height"), 10)) {
      return true;
    }
    return false;
  }
}

function transformImagesInBook(where, mode, res){
   //mode = 1 --> images are displayed on top of one another
   //mode = 2 --> images are displayed two by two occidental reading mode
   //mode = 3 --> images are displayed two by two japanese reading mode

   var nbSinglePages = 0;
   var posImg = [];
   var isFirstDouble = true;
   var isEven = true;
   //console.log("Transformation book : Nombre d'images" + $(".imageAMR", where).size());
   $(".imageAMR", where).sort(function(a, b) {
      var nba = $(a).closest(".spanForImg").data("order");
      var nbb = $(b).closest(".spanForImg").data("order");
      return ((nba < nbb) ? -1 : ((nba == nbb) ? 0 : 1));
   }).each(function (index) {
    //console.log("setting image position...");
    if (isLandscape(this) || getMirrorScript().isImageInOneCol(this, document, window.location.href)) {
      posImg[index] = 2;
      if (isLandscape(this) && isFirstDouble) {
        if (index !== 0 && posImg[index-1] != 1) {
          for (var i = 0; i < posImg.length; i++) {
            if (posImg[i] != 2) {
              posImg[i] = (posImg[i]+1) % 2;
            }
          }
        }
        isFirstDouble = false;
      }
      isEven = true;
    } else {
      if (index == $(".imageAMR", where).size() - 1 && isEven) {
        posImg[index] = 2;
      } else {
        posImg[index] = isEven ? 0 : 1;
        isEven = !isEven;
      }
    }
   });

   var parity = nbSinglePages % 2;

   $(where).css("text-align", "center");
   var evenImg = null;
   var tableRes = $("<table class='AMRtable'></table>");
   tableRes.css("width", "100%");
   tableRes.css("position", "static");

   $(".spanForImg", where).sort(function(a, b) {
    var nba = $(a).data("order");
    var nbb = $(b).data("order");
      return ((nba < nbb) ? -1 : ((nba == nbb) ? 0 : 1));
   }).each(function (index) {
     var divMode = ($("div > img", this).data("canvasId"));
     //if (divMode) console.log("DIV MODE");
     //if (!divMode) console.log("NOT DIV MODE");

      //console.log("displaying image position...");
      var td = $("<td></td>");

      if (!divMode) {
        //$("img:first-child", this).css("margin-right", "10px");
        if ($("img:first-child", this).attr("src") != chrome.extension.getURL("img/imgerror.png")) {
          $("img:first-child", this).css("margin-bottom", "50px");
          //$("img:first-child", this).css("border", "10px solid white");
          td.css("vertical-align", "middle");
        }
      }
      $(this).appendTo(td);

      //console.log("Displaying " + $("img:first-child", this).data("urlToLoad") + " in the table");
      var trTmp;
      if (posImg[index] == 2 || mode == 1) {
        if (evenImg !== null) {
          var trForEven = $("<tr></tr>");
          trForEven.appendTo(tableRes);
          evenImg.appendTo(trForEven);
          evenImg.attr("colspan", "2");
          evenImg = null;
          if (res.resize == 1) {
            if (!divMode) $("img", trForEven).css("max-width", (screen.width-200) + 'px');
          }
        }
        trTmp = $("<tr></tr>");
        trTmp.appendTo(tableRes);
        td.attr("colspan", "2");
        td.appendTo(trTmp);
        if (res.resize == 1) {
          if (!divMode) $("img", trTmp).css("max-width", (screen.width-200) + 'px');
        }
      } else {
        if (evenImg !== null) {
          trTmp = $("<tr></tr>");
          trTmp.appendTo(tableRes);
          if (mode == 2) {
            evenImg.appendTo(trTmp);
            evenImg.css("text-align", "right");
            td.appendTo(trTmp);
            td.css("text-align", "left");
          } else {
            td.appendTo(trTmp);
            td.css("text-align", "right");
            evenImg.appendTo(trTmp);
            evenImg.css("text-align", "left");
          }
          if (res.resize == 1) {
            if (!divMode) $("img", trTmp).css("max-width", ((screen.width-200) / 2) + 'px');
          }
          evenImg = null;
        } else {
          if (posImg[index] === 0) {
            evenImg = td;
          } else {
            trTmp = $("<tr></tr>");
            trTmp.appendTo(tableRes);
            td.attr("colspan", "2");
            td.appendTo(trTmp);
            if (res.resize == 1) {
              if (!divMode) $("img", trTmp).css("max-width", ((screen.width-200) / 2) + 'px');
            }
          }
        }

      }
   });

   var divMode = ($("img:first-child", this).data("canvasId"));

   if (!divMode) {
    var td = $("<td></td>");
    $("img:first-child", this).css("margin-bottom", "50px");
    $("img:first-child", this).css("margin-right", "10px");
    //$("img:first-child", this).css("border", "10px solid white");
    $("img:first-child", this).appendTo(td);
   }
    if (evenImg !== null) {
      var trTmp = $("<tr></tr>");
      trTmp.appendTo(tableRes);
      if (mode == 2) {
        evenImg.appendTo(trTmp);
        evenImg.css("text-align", "right");
        td.appendTo(trTmp);
        td.css("text-align", "left");
      } else {
        td.appendTo(trTmp);
        td.css("text-align", "right");
        evenImg.appendTo(trTmp);
        evenImg.css("text-align", "left");
      }
      if (res.resize == 1) {
        if (!divMode) $("img", trTmp).css("max-width", ((screen.width-200) / 2) + 'px');
      }
      evenImg = null;
    }

    $("table", where).remove();
    tableRes.appendTo(where);
}

function loadNextChapter(urlNext) {
  // load an iframe with urlNext and get list of images
  chrome.runtime.sendMessage({action: "getNextChapterImages", url: urlNext, mirrorName: getMirrorScript().mirrorName}, function(resp) {
     var lst = resp.images;
     if (lst !== null) {
       for (var i = 0; i < lst.length; i++) {
        var img = new Image();
        $(img).data("attempts", 0);
        $(img).data("id", i);
        $(img).data("urltoload", lst[i]);
        $(img).data("urlnext", urlNext);
        $(img).data("total", lst.length);
        $(img).load(onLoadNextImage);
        $(img).error(onErrorNextImage);
        getMirrorScript().getImageFromPageAndWrite(lst[i], img, document, urlNext);
       }
     }
  });
}

function onLoadNextImage() {
  var lstbtn = [];
  var id = "nChapBtn";
  var i = 0;
  while ($("#" + id + i).size() > 0) {
    lstbtn[lstbtn.length] = $("#" + id + i);
    i++;
  }
  var _self = this;
  $.each(lstbtn, function(index) {
    if ($(this).data("nbloaded")) {
      $(this).data("nbloaded", $(this).data("nbloaded") + 1);
    } else {
      $(this).data("nbloaded", 1);
    }
    var prog;
    if ($(".AMRprogress", $(this)).size() === 0) {
      prog = $("<span class='buttonAMR AMRprogress'></span>");
      prog.css("position", "relative");
      prog.css("top", "0");
      prog.css("left", "0");
      prog.css("width", "0px");
      prog.css("height", "4px");
      prog.css("border-radius", "2px");
      prog.css("border-radius", "2px");
      prog.css("background-color", "#8888EE");
      prog.css("opacity", "1");
      prog.css("display", "block");

      prog.appendTo($(this));
    } else {
      prog = $(".AMRprogress", $(this));
    }
    //console.log((this[0].offsetWidth * ($(this).data("nbloaded") / $(_self).data("total"))) + " --> " + $(this).data("nbloaded") + " ; " + $(_self).data("total"));
    prog.css("width", (this[0].offsetWidth * ($(this).data("nbloaded") / $(_self).data("total"))) + "px");
  });
}

function onErrorNextImage() {
  //TODO retry...
}

function setHWZoom(img) {
  $(img).css("height", $(img).data("zoom") * $(img).data("baseheight") + "px");
  $(img).css("width", $(img).data("zoom") * $(img).data("basewidth") + "px");
  $(img).css("max-width", "none");
}

function getTopPlus() {
  "use strict";
  var ret;
  if (document.body.style.borderTopWidth !== undefined && document.body.style.borderTopWidth !== "") {
    ret = parseInt(document.body.style.borderTopWidth, 10);
  } else {
    ret = 0;
  }
  return ret;
}

function zoomin(){
  var ancheight = document.body.offsetHeight - getTopPlus();
  $(".imageAMR").each(function(index) {
    if ($(this).data("zoom")) {
      $(this).data("zoom", $(this).data("zoom") * 1.2);
    } else {
      $(this).data("zoom", 1.2);
      $(this).data("baseheight", $(this).height());
      $(this).data("basewidth", $(this).width());
    }
    setHWZoom(this);
  });
  var newheight = document.body.offsetHeight - getTopPlus();
  var ratioY = (newheight / ancheight);

  $.scrollTo('50%',{axis:'x'});
  window.scrollBy(0, window.scrollY * (ratioY - 1));
}

function zoomout(){
  var ancheight = document.body.offsetHeight - getTopPlus();
  $(".imageAMR").each(function(index) {
    if ($(this).data("zoom")) {
      $(this).data("zoom", $(this).data("zoom") * 0.833);
    } else {
      $(this).data("zoom", 0.833);
      $(this).data("baseheight", $(this).height());
      $(this).data("basewidth", $(this).width());
    }
    setHWZoom(this);
  });
  var newheight = document.body.offsetHeight - getTopPlus();
  var ratioY = (newheight / ancheight);

  $.scrollTo('50%',{axis:'x'});
  window.scrollBy(0, window.scrollY * (ratioY - 1));
}

function zoomrest(){
  $(".imageAMR").each(function(index) {
    if(this.style.zoom !== 0)
        this.style.zoom *= 0;
      else
        this.style.zoom = 0;
  });
}

function stopEventProp(e) {
  e.stopPropagation();
}

function setKeys() {
  //disable default websites shortcuts (mangafox)
  document.onkeypress=null;
  document.onkeydown=null;
  document.onkeyup=null;
  $(document).unbind('keyup');
  $(document).unbind('keydown');
  $(document).unbind('keypress');
  $(document).keyup(stopEventProp);
  //$(document).keydown(stopEventProp);
  //$(document).keypress(stopEventProp);
  $(document).delegate('*', 'keyup', stopEventProp);
  //$(document).delegate('*', 'keydown', stopEventProp);
  //$(document).delegate('*', 'keypress', stopEventProp);

  $(document).keydown(function(e){
    var t = getTarget(e);
    if (!((t.type && t.type == "text") || t.nodeName.toLowerCase() == "textarea")) {
      if (e.which == 87) { //W
        window.scrollBy(0, -40);
      }
      if (e.which == 83) { //S
        window.scrollBy(0, 40);
      }
      if (e.which == 107) { //+
        zoomin();
      }
      if (e.which == 109) { //-
         zoomout();
      }
      if (e.which == 66) { //b
        if ($("#pChapBtn0").size()>0) {
          window.location.href = $("#pChapBtn0").attr("href");
        }
      }
      if (e.which == 78) { //n
        if ($("#nChapBtn0").size()>0) {
          window.location.href = $("#nChapBtn0").attr("href");
        }
      }
      if (useLeftRightKeys) {
        var doubleTap,
          nb,
          curimg,
          viss;
        //Left key or A
        if ((e.which == 37) || (e.which == 65)) {
          doubleTap = false;
          if (lastpresstime !== undefined && new Date().getTime() - lastpresstime < 500 && dirpress !== undefined && dirpress == 1) {
            doubleTap = true;
          }
          dirpress=1;
          lastpresstime = new Date().getTime();
          //Get first visible image
          curimg = whichImageIsFirst(true);
          if (curimg !== null && curimg.size() > 0) {
            //Check if top and bottom of this image are visible
            viss = topbotVis(curimg);
            //If top not visible
            if (!viss.topVis && !doubleTap) {
              //Move to top of current scan
              $.scrollTo($(curimg).closest("tr")[0], 800, {queue:true});
            } else {
              //Calculate previous scan id
              nb = curimg.data("order") - 1;
              if (nb == -1) {
                //Current scan was first scan, move to top
                $.scrollTo($(document.body), 800, {queue:true});
              } else {
                //Move to bottom of previous scan
                $(".spanForImg").each(function(index) {
                  if ($(this).data("order") == nb) {
                    $.scrollTo($(this).closest("tr")[0], 800, {queue:true, offset: {top: scrollbotoffset($(this).closest("tr")[0])}});
                  }
                });
              }
            }
          }
          e.preventDefault();
          e.stopPropagation();
        }
        //Right key or D
        if ((e.which == 39) || (e.which == 68)) {
          doubleTap = false;
          if (lastpresstime !== undefined && new Date().getTime() - lastpresstime < 500 && dirpress !== undefined && dirpress == 2) {
            doubleTap = true;
          }
          lastpresstime = new Date().getTime();
          dirpress=2;
          //If we are at top of the page --> move to first scan
          if (window.pageYOffset === 0) {
            nb = 0;
            $(".spanForImg").each(function(index) {
              if ($(this).data("order") == nb) {
                $.scrollTo($(this).closest("tr")[0], 800, {queue:true});
              }
            });
          } else {
            if (window.pageYOffset >= document.documentElement.scrollHeight - window.innerHeight) {
              if (nextRight) {
                if ($("#nChapBtn0").size()>0) {
                  window.location.href = $("#nChapBtn0").attr("href");
                }
              }
            }
            //Get first visible image
            curimg = whichImageIsFirst(false);
            if (curimg !== null && curimg.size() > 0) {
              //Check if top and bottom of this image are visible
              viss = topbotVis(curimg[0]);
              //If bottom not visible
              if (!viss.bottomVis && !doubleTap) {
                //Move to bottom of current scan
                $.scrollTo($(curimg).closest("tr")[0], 800, {queue:true, offset: {top: scrollbotoffset($(curimg).closest("tr")[0])}});
              } else {
                //Calculate next scan id
                nb = curimg.data("order") + 1;
                if (nb >= $(".spanForImg").size()) {
                  //Current scan was last scan -> move to bottom of page
                  $.scrollTo($(document.body), 800, {queue:true, offset: {top: document.body.offsetHeight}});
                } else {
                  // Move to top of next scan
                  $(".spanForImg").each(function(index) {
                    if ($(this).data("order") == nb) {
                      $.scrollTo($(this).closest("tr")[0], 800, {queue:true});
                    }
                  });
                }
              }
            }
          }
          e.preventDefault();
          e.stopPropagation();
        }
      }
    } else {
      //alert("TEXT FIELD FOCUS");
      /*$(t).keydown(e);
      e.preventDefault();
      e.stopPropagation();*/
    }
    //e.preventDefault();
  });

  var timer = window.setInterval(function() {
            if (/loaded|complete/.test(document.readyState)){
                window.clearInterval(timer);
                enableContextMenu();
            }
          }, 100);
}

function enableContextMenu() {
  void(document.ondragstart=null);
  void(document.onselectstart=null);
  void(document.onclick=null);
  void(document.onmousedown=null);
  void(document.onmouseup=null);
  void(document.oncontextmenu=null);
  void(document.body.oncontextmenu=null);
  removeContextOn("img");
  removeContextOn("td");
}

function removeContextOn(elt) {
  var elements=document.getElementsByTagName(elt);
  //for (var e in elements) {
  for (var i=0;i<elements.length;i++) {
    e=elements[i];
    void(e.oncontextmenu=null);
  }
}

function topbotVis(spanFimg) {
  var isTopVisible = true;
  var isBotVisible = true;
  var fTop = $("img:visible", $(spanFimg)).sort(function(a, b) {
    var aTop = a.offsetTop + a.offsetParent.offsetTop;
    var bTop = b.offsetTop + b.offsetParent.offsetTop;
    //console.log("Top : a : " + aTop + " ; b : " + bTop + " --> " + ((aTop < bTop) ? -1 : ((aTop == bTop) ? 0 : 1)));
    return ((aTop < bTop) ? -1 : ((aTop == bTop) ? 0 : 1));
  }).first();
  //console.log(fTop);
  if (!topVisible(fTop[0])) {
    isTopVisible = false;
  }
  var lBot = $("img:visible", $(spanFimg)).sort(function(a, b) {
    var aBot = a.offsetTop + a.offsetHeight + a.offsetParent.offsetTop + a.offsetParent.offsetHeight;
    var bBot = b.offsetTop + b.offsetHeight + b.offsetParent.offsetTop + b.offsetParent.offsetHeight;
    //console.log("Bottom : a : " + aBot + " ; b : " + bBot + " --> " + ((aBot < bBot) ? -1 : ((aBot == bBot) ? 0 : 1)));
    return ((aBot < bBot) ? -1 : ((aBot == bBot) ? 0 : 1));
  }).last();
  //console.log(lBot);
  if (!bottomVisible(lBot[0])) {
    isBotVisible = false;
  }
  //console.log({bottomVis: isBotVisible, topVis: isTopVisible});
  return {bottomVis: isBotVisible, topVis: isTopVisible};
}

function getTarget(e) {
  e = e || window.event;
  return e.target || e.srcElement;
}

function whichImageIsFirst(needFirst) {
  var resp = null;
  $(".AMRtable tr").each(function(index) {
    var isVisible = false;
    $(".spanForImg img", $(this)).each(function(index) {
      if (elementInViewport2(this)) {
        isVisible = true;
      }
    });
    //console.log("isVisible : " + isVisible);
    if (isVisible) {
      if (!needFirst && resp === null) {
        //Return the last scan of the first visible tr
        resp = $(".spanForImg", $(this)).sort(function(a, b) {
          var nba = $(a).data("order");
          var nbb = $(b).data("order");
          return ((nba < nbb) ? -1 : ((nba == nbb) ? 0 : 1));
         }).last();
      } else if (needFirst) {
        //return the first scan of the last visible tr
        resp = $(".spanForImg", $(this)).sort(function(a, b) {
          var nba = $(a).data("order");
          var nbb = $(b).data("order");
          return ((nba < nbb) ? -1 : ((nba == nbb) ? 0 : 1));
         }).first();
      }
    }
  });
  return resp;
}

function scrollbotoffset(el) {
  var height = el.offsetHeight;
  return height - window.innerHeight - 45;
}

function elementInViewport2(el) {
  var top = el.offsetTop;
  var left = el.offsetLeft;
  var width = el.offsetWidth;
  var height = el.offsetHeight;

  while(el.offsetParent) {
    el = el.offsetParent;
    top += el.offsetTop;
    left += el.offsetLeft;
  }
  top += el.offsetTop;
  left += el.offsetLeft;

  //console.log("top : " + top + " ; height : " + height + " ; wyo : " + window.pageYOffset + " ; wyo + wih : " + (window.pageYOffset + window.innerHeight));
  //left < (window.pageXOffset + window.innerWidth) &&
  //(left + width) > window.pageXOffset
  return (
    top < (window.pageYOffset + window.innerHeight) &&
    (top + height) > window.pageYOffset
  );
}

function bottomVisible(el) {
  var top = el.offsetTop;
  var height = el.offsetHeight;

  while(el.offsetParent) {
    el = el.offsetParent;
    top += el.offsetTop;
  }
  top += el.offsetTop;
  //console.log("t+h " + (top + height) + " ; wt+wh " + window.pageYOffset + window.innerHeight );
  return (
    (top + height) <= window.pageYOffset + window.innerHeight
  );
}

function topVisible(el) {
  var top = el.offsetTop;
  var height = el.offsetHeight;

  while(el.offsetParent) {
    el = el.offsetParent;
    top += el.offsetTop;
  }
  top += el.offsetTop;
  return (
    top >= (window.pageYOffset)
  );
}

/*
  How does this works.... and this is the only way to load a remote script and
  use it in a page like that...
   - Call background page with current url to see if it matches
   - if url matches, bakground page loads the script from remote server and call
   chrome.tabs.executeScript(current tab) to execute it in this context...
   - the script contains a call to registerMangaObject
   - the content script stores the object

   --> NO CALL TO EVAL and get the remote object...
*/
function registerMangaObject(mirrorName, object) {
  currentMirror = object;
}
