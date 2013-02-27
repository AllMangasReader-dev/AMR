var mirrors;
var mangas;
var parameters;
var bookmarks;
function openTab(urlToOpen) {
   chrome.extension.sendRequest({
      action : "opentab",
      url : urlToOpen
   }, function (response) {});
}
function sendExtRequest(request, button, callback, backsrc) {
   if (button.data("currentlyClicked"))
      return;
   button.data("currentlyClicked", true);
   var _ancSrc;
   if (button.is("img")) {
      _ancSrc = button.attr("src");
      button.attr("src", chrome.extension.getURL("img/load16.gif"));
   } else {
      if (button.is(".button")) {
         _ancSrc = $("<img src='" + chrome.extension.getURL("img/ltload.gif") + "'></img>")
            _ancSrc.appendTo(button);
      }
      if (button.is(".category") || button.is(".mgcategory")) {
         _ancSrc = $("<img src='" + chrome.extension.getURL("img/load10.gif") + "'></img>")
            _ancSrc.appendTo(button);
      }
   }
   chrome.extension.sendRequest(request, function () {
      callback();
      if (button.is("img")) {
         if (backsrc) {
            button.attr("src", _ancSrc);
         }
      } else {
         if (button.is(".button") || button.is(".category") || button.is(".mgcategory")) {
            _ancSrc.remove();
         }
      }
      button.removeData("currentlyClicked");
   });
}
function isNew(mg) {
   var ret = false;
   if (mg.read == 0) {
      if (mg.listChaps.length > 0) {
         if (mg.listChaps[0][1] != mg.lastChapterReadURL) {
            ret = true;
         }
      }
   }
   return ret;
}
function actionPlay() {
   openTab(closestEltData($(this)).data("mgplay"));
}
function actionBack() {
   var opt = $(".mglist select option:selected", closestEltData($(this)));
   openTab((opt.next().size() > 0) ? opt.next().val() : opt.val());
}
function actionForward() {
   var opt = $(".mglist select option:selected", closestEltData($(this)));
   openTab((opt.prev().size() > 0) ? opt.prev().val() : opt.val());
}
function actionEnd() {
   var opt = $(".mglist select option:first", closestEltData($(this)));
   openTab(opt.val());
}
function actionRead() {
   var obj = {
      action : "readManga",
      url : closestEltData($(this)).data("mgurl"),
      lastChapterReadURL : closestEltData($(this)).data("mglatesturl")
   };
   var _self = this;
   sendExtRequest(obj, $(this), function () {
      $(_self).unbind("click");
      $(_self).attr("src", chrome.extension.getURL("img/blank.png"));
      closestEltData($(_self)).removeClass("new");
      closestEltData($(_self)).data("mgplay", $(".mglist select option:first", closestEltData($(_self))).val());
      $(".mglist select", closestEltData($(_self))).val($(".mglist select option:first", closestEltData($(_self))).val());
      if (isInGroup($(_self))) {
         if (groupHasNew($(_self))) {
            moveMangaElement($(".mgtitle", closestEltData($(_self))));
         } else {
            $(_self).closest(".manga").removeClass("new");
            $(".actreadall", $(_self).closest(".manga")).remove();
            moveMangaParent($(".mgtitle", closestEltData($(_self))));
         }
      } else {
         moveMangaParent($(".mgtitle", closestEltData($(_self))));
      }
      updateProgression($(_self));
   }, false);
}
function fillActions(mg, where, hasdown) {
   var acts = "<img src='img/backward.png' class='actback' title='View previous chapter'/><img src='img/play.png' class='actplay' title='View latest chapter read'/><img src='img/foward.png' class='actfor' title='View next chapter'/><img src='img/toend.png' class='actend' title='View latest published chapter'/><img src='img/cancel.png' class='deletemg' title='Delete this manga from reading list'/>";
   if (isNew(mg)) {
      acts = "<img src='img/eye.png' class='actread' title='Mark latest published chapter as read' />" + acts;
   } else {
      acts = "<img src='img/blank.png' class='actblank' />" + acts;
   }
   if (hasdown) {
      acts += "<img src='img/down_der.png' class='clipoths' title='View other informations and actions for this manga'/>";
   }
   $(acts).appendTo(where);
}
function fillChapters(mg, sel) {
   setTimeout(function () {
      var opt = $("<option value=''></option>");
      if (mg.listChaps.length > 0) {
         $.each(mg.listChaps, function (index, val) {
            opt.clone().val(val[1]).text(val[0]).attr("selected", ((val[1] == mg.lastChapterReadURL) ? "selected" : "")).appendTo(sel);
         });
         sel.attr("title", "Latest published chapter : " + mg.listChaps[0][0]);
         sel.change(function () {
            openTab($(this).val());
         });
      } else {
         $("<span>No chapters found yet...</span>").appendTo(sel.parent().parent());
         sel.parent().remove();
      }
   }, 1);
}
function fillCategories(mg, where) {
   if (mg.length) {
      var categs = [];
      $.each(mg, function (index, manga) {
         $.each(manga.cats, function (index, cat) {
            var found = false;
            $.each(categs, function (index, val) {
               if (cat == val) {
                  found = true;
               }
            });
            if (!found) {
               if (categs.length == 0) {
                  where.empty();
               }
               categs[categs.length] = cat;
               $("<div class='mgcategory'>" + cat + "<img class='actcatmgdel' src='img/delete10.png' title='Delete this category from this manga' /></div>").appendTo(where);
            }
         });
      });
      bindCatsButtons();
   } else {
      if (mg.cats.length > 0) {
         where.empty();
      }
      $.each(mg.cats, function (index, cat) {
         $("<div class='mgcategory'>" + cat + "<img class='actcatmgdel' src='img/delete10.png' title='Delete this category from this manga' /></div>").appendTo(where);
      });
      bindCatsButtons();
   }
}
function progression(mg) {
   if (mg.length) {
      var min = 100;
      $.each(mg, function (index, val) {
         var ptmp = progression(val);
         if (ptmp < min)
            min = ptmp;
      });
      return min;
   } else {
      var value = 0;
      if (mg.listChaps.length > 0) {
         $.each(mg.listChaps, function (index, val) {
            if (val[1] == mg.lastChapterReadURL) {
               if (mg.listChaps.length < 2) {
                  value = 100;
               } else {
                  value = Math.floor((mg.listChaps.length - 1 - index) * 100 / (mg.listChaps.length - 1));
               }
            }
         });
      }
      return value;
   }
}
function updateProgression(elt) {
   var par;
   if (elt.is(".manga")) {
      par = elt;
   } else {
      par = elt.closest(".manga");
   }
   var progBar = $(".mgprogress", par);
   var progNum = $(".mgprogressnum", par);
   var selects;
   if (isInGroup($(".mgtitle:first", par))) {
      if (isList()) {
         selects = $(".mgline select", par);
      } else {
         selects = $(".mgelt select", par);
      }
   } else {
      selects = $(".mglist select", par);
   }
   var value = 0;
   if (selects.size() > 0) {
      var min = 100;
      selects.each(function (index) {
         var tmpval = 0;
         var nbTot = $("option", $(this)).size();
         $("option", $(this)).each(function (index) {
            if ($(this).is(":selected")) {
               if (nbTot < 2) {
                  tmpVal = 100;
               } else {
                  tmpval = Math.floor((nbTot - 1 - index) * 100 / (nbTot - 1));
               }
            }
         });
         if (tmpval < min)
            min = tmpval;
      });
      value = min;
   }
   progBar.progressbar({
      "value" : value
   });
   progNum.text(value + "%");
}
function addBookmarkInSel(bm, sel) {
   var isGroup = isInGroup(sel);
   var optgrp;
   if (bm.type == "chapter") {
      if ($("optgroup[label='Chapters']", sel).size() > 0) {
         optgrp = $("optgroup[label='Chapters']", sel);
      } else {
         optgrp = $("<optgroup label='Chapters'></optgroup>")
            optgrp.appendTo(sel);
      }
   } else {
      if ($("optgroup[label='Scans']", sel).size() > 0) {
         optgrp = $("optgroup[label='Scans']", sel);
      } else {
         optgrp = $("<optgroup label='Scans'></optgroup>")
            optgrp.appendTo(sel);
      }
   }
   var nt = bm.note;
   var broken = false;
   if (nt.length > 30) {
      broken = true;
      nt = nt.substring(0, 30) + "...";
   }
   var ch = bm.chapName;
   if (ch.length > 20)
      nt = ch.substring(0, 20) + "...";
   var txt = nt + " (" + ch + (isGroup ? " - " + bm.mirror : "") + ")";
   var opt = $("<option value='" + bm.chapUrl + "' title='" + (broken ? escape(bm.note) : "") + "'>" + txt + "</option>");
   opt.data("bmmirror", bm.mirror);
   opt.appendTo(optgrp);
}
function addLastUpdate(mg, where, wheretit) {
   var ts;
   if (mg.length) {
      ts = 0;
      for (var i = 0; i < mg.length; i++) {
         if (mg[i].upts > ts) {
            ts = mg[i].upts;
         }
      }
   } else {
      ts = mg.upts;
   }
   if (ts != 0) {
      if (parameters.displastup == 1) {
         $("<img class=\"lastupdatedate\" src=\"" + chrome.extension.getURL(getPicTs(ts)) + "\" title=\"Last time new chapter : " + prettyDate(ts) + "\" />").appendTo(where);
      } else {
         wheretit && wheretit.attr("title", "Last time new chapter : " + prettyDate(ts));
      }
   } else {
      wheretit && wheretit.attr("title", "Last time new chapter : never");
   }
}
function prettyDate(time) {
   var diff = ((new Date().getTime() - time) / 1000);
   var day_diff = Math.floor(diff / 86400);
   if (isNaN(day_diff) || day_diff < 0) {
      return;
   }
   return day_diff == 0 && (diff < 60 && "just now" || diff < 120 && "1 minute ago" || diff < 3600 && Math.floor(diff / 60) + " minutes ago" || diff < 7200 && "1 hour ago" || diff < 86400 && Math.floor(diff / 3600) + " hours ago") || day_diff == 1 && "Yesterday" || day_diff < 7 && day_diff + " days ago" || day_diff < 31 && Math.ceil(day_diff / 7) + " weeks ago" || Math.ceil(day_diff / 30.43) + " month ago";
}
function getPicTs(time) {
   var diff = ((new Date().getTime() - time) / 1000);
   var day_diff = Math.floor(diff / 86400);
   if (isNaN(day_diff) || day_diff < 0) {
      return;
   }
   return (diff < 86400 && "img/day.png") || (day_diff == 1 && "img/day.png") || (day_diff < 7 && "img/week.png") || (day_diff < 31 && "img/month.png") || "img/month.png";
}
function fillBookmarks(mg, where) {
   if (bookmarks.length > 0) {
      var first = true;
      setTimeout(function () {
         var sel;
         $.each(bookmarks, function (index, val) {
            if (mg.length) {
               $.each(mg, function (index, mang) {
                  if ((mang.mirror == val.mirror && mang.url == val.url)) {
                     if (first) {
                        where.empty();
                        $("<span class='custom-select'><select><option>Select a bookmark</option></select></span>").appendTo(where);
                        sel = $("select", where);
                        sel.change(function () {
                           if ($(this).val()) {
                              openTab($(this).val());
                           }
                        });
                        first = false;
                     }
                     addBookmarkInSel(val, sel);
                  }
               });
            } else {
               if ((mg.mirror == val.mirror && mg.url == val.url)) {
                  if (first) {
                     where.empty();
                     $("<span class='custom-select'><select><option>Select a bookmark</option></select></span>").appendTo(where);
                     sel = $("select", where);
                     sel.change(function () {
                        if ($(this).val()) {
                           openTab($(this).val());
                        }
                     });
                     first = false;
                  }
                  addBookmarkInSel(val, sel);
               }
            }
         });
      }, 1);
   }
}
function fillOthers(mg, where) {
   var oths = $("<div class='mgothers hide buttons'></div>");
   var prog = $("<div class='mgotherscont'><span>Progression : </span><div class='mgprogress'></div><span class='mgprogressnum'></span></div>");
   var progval = progression(mg);
   $(".mgprogress", prog).progressbar({
      "value" : progval
   });
   $(".mgprogressnum", prog).text(progval + "%");
   prog.appendTo(oths);
   var infos = $("<div class='mgotherscont'></div>");
   var infoTab = $("<table class='mginfos'><tr><td><span>Categories : </span><div class='mginfo cats'>No categories for this manga</div></td><td><span>Bookmarks : </span><div class='mginfo books'>No bookmarks for this manga</div></td></tr></table>");
   infoTab.appendTo(infos);
   infos.appendTo(oths);
   fillCategories(mg, $(".cats", infoTab));
   fillBookmarks(mg, $(".books", infoTab));
   var buts = $("<div class='mgotherscont'><div class='button actsearchmg'>Search this mangas elsewhere</div><div class='button actresetreading'>Reset manga reading</div><div class='button actstopupdates' title='If a manga stops follow updates, AMR will check latest published chapters but won t notify you'>Stop following updates</div><div class='button actstopupdating' title='If a manga stops updating, AMR won t try to get updates from website.'>Stop updating</div></div>");
   var isRead = false;
   var isUpdate = true;
   if (mg.length) {
      $.each(mg, function (index, val) {
         if (val.read == 1) {
            isRead = true;
         }
         if (val.update == 0) {
            isUpdate = false;
         }
      });
   } else {
      if (mg.read == 1)
         isRead = true;
      if (mg.update == 0)
         isUpdate = false;
   }
   if (isRead) {
      $(".actstopupdates", buts).text("Follow updates");
   }
   if (!isUpdate) {
      $(".actstopupdating", buts).text("Continue update");
   }
   buts.appendTo(oths);
   oths.appendTo(where);
   var question = $("<div class='mgothers hide question'><span>Are you sure to delete this manga ?</span><div class='button yes'>Yes</div><div class='button no'>No</div></div>");
   question.appendTo(where);
   var question2 = $("<div class='mgothers hide questionreset'><span>Are you sure reset reading for this manga ?</span><div class='button yes'>Yes</div><div class='button no'>No</div></div>");
   question2.appendTo(where);
}
function closestEltData(elt) {
   if (isList()) {
      if ($(".mgline", $(elt).closest(".manga")).size() >= 1) {
         return $(elt).closest(".mgline");
      } else {
         return $(elt).closest(".manga");
      }
   } else {
      if ($(".mgelt", $(elt).closest(".manga")).size() >= 1) {
         return $(elt).closest(".mgelt");
      } else {
         return $(elt).closest(".manga");
      }
   }
}
function isList() {
   return ($("#main").is(".list"));
}
function isInGroup(elt) {
   if (isList()) {
      return ($(".mgline", $(elt).closest(".manga")).size() >= 1);
   } else {
      return ($(".mgelt", $(elt).closest(".manga")).size() >= 1);
   }
}
function groupHasNew(elt) {
   if (isList()) {
      return ($(".mgline.new", $(elt).closest(".manga")).size() >= 1);
   } else {
      return ($(".mgelt.new", $(elt).closest(".manga")).size() >= 1);
   }
}
function isInFirstOfGroup(elt) {
   if (isInGroup(elt)) {
      if (isList()) {
         return $(elt).closest(".mgline").is(":first-child");
      } else {
         return $(elt).closest(".mgelt").is(":first-child");
      }
   } else {
      return true;
   }
}
function nbOfGroup(elt) {
   if (isInGroup(elt)) {
      if (isList()) {
         return $(".mgline", $(elt).closest(".manga")).size();
      } else {
         return $(".mgelt", $(elt).closest(".manga")).size();
      }
   } else {
      return 1;
   }
}
function getFirstElementOfGroup(elt) {
   if (isInGroup(elt)) {
      if (isList()) {
         return $($(".mgline", $(elt).closest(".manga"))[0]);
      } else {
         return $($(".mgelt", $(elt).closest(".manga"))[0]);
      }
   } else {
      return null;
   }
}
function getSecondElementOfGroup(elt) {
   if (isInGroup(elt)) {
      if (isList()) {
         return $($(".mgline", $(elt).closest(".manga"))[1]);
      } else {
         return $($(".mgelt", $(elt).closest(".manga"))[1]);
      }
   } else {
      return null;
   }
}
function switchHeader(first, second) {
   $(".clipoths", first).appendTo($(".mgactions", second));
   if (isList()) {
      $(".mgtitle", second).remove();
      $(".mgtitle", first).prependTo(second);
      $("<div class='mgtitle'></div>").prependTo(first);
      second.css("display", "table-row");
   } else {
      $(".mgtitle", second).after($("<div class='mgfirstfloatimg'></div>"));
      $(".mgtitlehead img", second).appendTo($(".mgfirstfloatimg", second));
      $(".mgtitleheadpics", first).appendTo($(".mgtitle", second));
      $("<img src='img/plus.png' class='multiplemgs' /><span class='mgname'></span>").appendTo($(".mgtitlehead", second));
      bindMultipleMgs();
      $(".mgname", second).text($(".mgtitle", first).text());
      $(".mgname", second).click(function () {
         openTab(closestEltData($(this)).data("mgurl"));
      });
      $(".mgname", first).remove();
      second.css("display", "block");
      $(".mgfirstfloatimg img", first).prependTo($(".mgtitlehead", first));
      $(".multiplemgs", first).remove();
   }
   second.removeClass("next");
   first.addClass("next");
}
function removeMangaParent(elt) {
   if (isInGroup(elt)) {
      if (nbOfGroup(elt) == 1) {
         elt.closest(".manga").toggle("blind", {}, 500, function () {
            $(this).remove();
            firstLastMg();
         });
      } else {
         if (isInFirstOfGroup(elt)) {
            var first = closestEltData(elt);
            var second = getSecondElementOfGroup(elt);
            switchHeader(first, second);
            if (!second.hasClass("new") && second.closest(".manga").hasClass("new")) {
               second.closest(".manga").removeClass("new");
               moveMangaParent($(".mgtitle", second));
            }
         }
         if (nbOfGroup(elt) == 2) {
            var stayingElt = closestEltData($(".mgtitleheadpics", elt.closest(".manga")));
            if (isList()) {
               $(".mglist img", stayingElt).prependTo($(".mgtitlehead", stayingElt));
            } else {
               $(".mgfirstfloatimg img", stayingElt).prependTo($(".mgtitlehead", stayingElt));
            }
            $(".multiplemgs", stayingElt).remove();
            $(".mgtitleheadpics", stayingElt).remove();
         }
         if (isList()) {
            var _mg = elt.closest(".manga");
            updateProgression(_mg);
            closestEltData(elt).remove();
            firstLastMg();
         } else {
            closestEltData(elt).toggle("blind", {}, 500, function () {
               var _mg = $(this).closest(".manga");
               updateProgression(_mg);
               $(this).remove();
               firstLastMg();
            });
         }
      }
   } else {
      closestEltData(elt).toggle("blind", {}, 500, function () {
         $(this).remove();
         firstLastMg();
      });
   }
}
function moveMangaParent(elt) {
   var eltAfter = findPlaceAfter(elt);
   var toMove = elt.closest(".manga");
   if (eltAfter == null) {
      toMove.toggle("blind", {}, 250, function () {
         toMove.appendTo($("#main"));
         toMove.toggle("blind", {}, 250);
         firstLastMg();
      });
   } else {
      toMove.toggle("blind", {}, 250, function () {
         eltAfter.before(toMove);
         toMove.toggle("blind", {}, 250);
         firstLastMg();
      });
   }
}
function moveMangaParentNew(elt) {
   var eltAfter = findPlaceAfterNew(elt);
   var toMove = elt.closest(".manga");
   if (eltAfter == null) {
      toMove.toggle("blind", {}, 250, function () {
         toMove.appendTo($("#main"));
         toMove.toggle("blind", {}, 250);
         firstLastMg();
      });
   } else {
      toMove.toggle("blind", {}, 250, function () {
         eltAfter.before(toMove);
         toMove.toggle("blind", {}, 250);
         firstLastMg();
      });
   }
}
function moveMangaElement(elt) {
   var eltAfter = null;
   var toMove;
   var isplaceOk = true;
   if (isList()) {
      if ($(".mgline:not(.new)", elt.closest(".manga")).size() > 1) {
         eltAfter = $($(".mgline:not(.new)", elt.closest(".manga"))[1]);
      }
      toMove = elt.closest(".mgline");
   } else {
      if ($(".mgelt:not(.new)", elt.closest(".manga")).size() > 1) {
         eltAfter = $($(".mgelt:not(.new)", elt.closest(".manga"))[1]);
      }
      toMove = elt.closest(".mgelt");
   }
   if (closestEltData(toMove).next().is(".new") || closestEltData(toMove).is(":last")) {
      isplaceOk = false;
   }
   if (!isplaceOk) {
      if (isInFirstOfGroup(elt)) {
         var first = closestEltData(elt);
         var second = getSecondElementOfGroup(elt);
         var wasVisible = second.is(":visible");
         switchHeader(first, second);
         if (!wasVisible) {
            first.toggle();
         }
      }
      if (isList()) {
         if (eltAfter == null) {
            $(toMove).appendTo($(".mgtable", elt.closest(".manga")));
         } else {
            eltAfter.before($(toMove));
         }
      } else {
         if (eltAfter == null) {
            toMove.toggle("blind", {}, 250, function () {
               $(".mgelt:last", elt.closest(".manga")).after($(this));
               $(this).toggle("blind", {}, 250);
            });
         } else {
            toMove.toggle("blind", {}, 250, function () {
               eltAfter.before($(this));
               $(this).toggle("blind", {}, 250);
            });
         }
      }
   }
}
function findPlaceAfter(elt) {
   var tit = $(".mgname", elt.closest(".manga")).text();
   tit = formatMgName(tit.trim());
   var eltNext = null;
   $(".manga:not(.new)").each(function (index) {
      if (eltNext == null) {
         var titTmp = $(".mgname", $(this)).text();
         titTmp = formatMgName(titTmp);
         if (titTmp > tit) {
            eltNext = $(this);
         }
      }
   });
   return eltNext;
}
function findPlaceAfterNew(elt) {
   var tit = $(".mgname", elt.closest(".manga")).text();
   tit = formatMgName(tit);
   var eltNext = null;
   $(".manga.new").each(function (index) {
      if (eltNext == null) {
         var titTmp = $(".mgname", $(this)).text();
         titTmp = formatMgName(titTmp);
         if (titTmp > tit) {
            eltNext = $(this);
         }
      }
   });
   if (eltNext == null) {
      if ($(".manga:not(.new)").size() > 0) {
         eltNext = $(".manga:not(.new):first");
      }
   }
   return eltNext;
}
function setData(elt, mg) {
   elt.data("mgname", mg.name);
   elt.data("mgurl", mg.url);
   elt.data("mgmirror", mg.mirror);
   elt.data("mgplay", mg.lastChapterReadURL);
   if (mg.listChaps.length > 0) {
      elt.data("mglatesturl", mg.listChaps[0][1]);
   } else {
      elt.data("mglatesturl", "");
   }
   if (mg.listChaps.length == 1) {
      elt.data("mgoneshot", true);
   } else {
      elt.data("mgoneshot", false);
   }
}
function createMangaEntryList(mangas, where) {
   var isRead = false;
   var isUpdate = true;
   if (mangas.length) {
      $.each(mangas, function (index, val) {
         if (val.read == 1) {
            isRead = true;
         }
         if (val.update == 0) {
            isUpdate = false;
         }
      });
   } else {
      if (mangas.read == 1)
         isRead = true;
      if (mangas.update == 0)
         isUpdate = false;
   }
   if (mangas.length) {
      var mg = $("<div class='manga'><div class='mgtable'></div></div>");
      var line = "<div class='mgline'><div class='mgtitle'><div class='mgtitlehead'><img src='img/plus.png' class='multiplemgs' /><span class='mgname'></span></div><div class='mgtitleheadpics'><img src='img/eyes.png' class='actreadall' title='Mark all manga from this group as read' /><img src='img/cancel.png' class='actdeleteall' title='Delete all manga from this group' /></div></div><div class='mglist'><img src='' class='mgmirroricon' /><span class='custom-select'><select></select></span></div><div class='mgactions'></div></div>";
      var linenext = "<div class='mgline next' style='display:none'><div class='mgtitle'></div><div class='mglist'><img src='' class='mgmirroricon' /><span class='custom-select'><select></select></span></div><div class='mgactions'></div></div>";
      $.each(mangas, function (index, val) {
         var mgunit;
         if (index == 0) {
            mgunit = $(line);
         } else {
            mgunit = $(linenext);
         }
         mgunit.appendTo($(".mgtable", mg));
         setData(mgunit, val);
         if (isRead) {
            if (index == 0) {
               mg.addClass("read");
            }
            mgunit.addClass("read");
         } else {
            if (isNew(val)) {
               if (index == 0) {
                  mg.addClass("new");
               }
               mgunit.addClass("new");
            }
         }
         if (!isUpdate) {
            if (index == 0) {
               mg.addClass("stopupdate");
            }
         }
         var img = $(".mgmirroricon", mgunit);
         var mir = getMangaMirror(val.mirror);
         if (mir != null) {
            img.attr("src", mir.mirrorIcon);
         } else {
            img.attr("src", chrome.extension.getURL("img/unknown.png"));
         }
         img.attr("title", val.mirror);
         img.click(function () {
            openTab(closestEltData($(this)).data("mgurl"));
         });
         $(".mgname", mgunit).text(val.name);
         $(".mgname", mgunit).click(function () {
            openTab(closestEltData($(this)).data("mgurl"));
         });
         var sel = $(".mglist select", mgunit);
         fillChapters(val, sel);
         fillActions(val, $(".mgactions", mgunit), (index == 0));
      });
      if (!mg.hasClass("new")) {
         $(".actreadall", mg).remove();
      }
      addLastUpdate(mangas, $(".mgtitlehead", mg), $(".mgname", mg));
      fillOthers(mangas, mg);
      if (!isMangaDisplayable(mg)) {
         mg.hide();
      }
      mg.appendTo(where);
   } else {
      var mg = $("<div class='manga'><div class='mgtable'><div class='mgtitle'><div class='mgtitlehead'><img src='' class='mgmirroricon' /><span class='mgname'></span></div></div><div class='mglist'><span class='custom-select'><select></select></span></div><div class='mgactions'></div></div></div>");
      setData(mg, mangas);
      if (isRead) {
         mg.addClass("read");
      } else {
         if (isNew(mangas)) {
            mg.addClass("new");
         }
      }
      if (!isUpdate) {
         mg.addClass("stopupdate");
      }
      var img = $(".mgmirroricon", mg);
      var mir = getMangaMirror(mangas.mirror);
      if (mir != null) {
         img.attr("src", mir.mirrorIcon);
      } else {
         img.attr("src", chrome.extension.getURL("img/unknown.png"));
      }
      img.attr("title", mangas.mirror);
      $(".mgname", mg).text(mangas.name);
      $(".mgname", mg).click(function () {
         openTab(closestEltData($(this)).data("mgurl"));
      });
      var sel = $(".mglist select", mg);
      fillChapters(mangas, sel);
      addLastUpdate(mangas, $(".mgtitlehead", mg), $(".mgname", mg));
      fillActions(mangas, $(".mgactions", mg), true);
      fillOthers(mangas, mg);
      if (!isMangaDisplayable(mg)) {
         mg.hide();
      }
      mg.appendTo(where);
   }
}
function createMangaEntryBlock(mangas, where) {
   var isRead = false;
   var isUpdate = true;
   if (mangas.length) {
      $.each(mangas, function (index, val) {
         if (val.read == 1) {
            isRead = true;
         }
         if (val.update == 0) {
            isUpdate = false;
         }
      });
   } else {
      if (mangas.read == 1)
         isRead = true;
      if (mangas.update == 0)
         isUpdate = false;
   }
   if (mangas.length) {
      var mg = $("<div class='manga'></div>");
      var line = "<div class='mgelt'><div class='mgactions'></div><div class='mgtitle'><div class='mgtitlehead'><img src='img/plus.png' class='multiplemgs' /><span class='mgname'></span></div><div class='mgtitleheadpics'><img src='img/eyes.png' class='actreadall' title='Mark all manga from this group as read' /><img src='img/cancel.png' class='actdeleteall' title='Delete all manga from this group' /></div></div><div class='mgfirstfloatimg'><img src='' class='mgmirroricon'/></div><div class='mgtable'><div class='mgline'><div class='label'>Latest chapter read :</div><div class='mglist'><span class='value latestread'></span></div></div><div class='mgline'><div class='label'>Latest chapter published :</div><div class='mglist'><span class='value latestpub'></span></div></div><div class='mgline'><div class='label'>Chapters :</div><div class='mglist'><span class='custom-select'><select></select></span></div></div></div></div>";
      var linenext = "<div class='mgelt next' style='display: none'><div class='mgactions'></div><div class='mgtitle'><div class='mgtitlehead'><img src='' class='mgmirroricon' /></div></div><div class='mgtable'><div class='mgline'><div class='label'>Latest chapter read :</div><div class='mglist'><span class='value latestread'></span></div></div><div class='mgline'><div class='label'>Latest chapter published :</div><div class='mglist'><span class='value latestpub'></span></div></div><div class='mgline'><div class='label'>Chapters :</div><div class='mglist'><span class='custom-select'><select></select></span></div></div></div></div>";
      $.each(mangas, function (index, val) {
         var mgunit;
         if (index == 0) {
            mgunit = $(line);
         } else {
            mgunit = $(linenext);
         }
         mgunit.appendTo(mg);
         setData(mgunit, val);
         if (isRead) {
            if (index == 0) {
               mg.addClass("read");
            }
            mgunit.addClass("read");
         } else {
            if (isNew(val)) {
               if (index == 0) {
                  mg.addClass("new");
               }
               mgunit.addClass("new");
            }
         }
         if (!isUpdate) {
            if (index == 0) {
               mg.addClass("stopupdate");
            }
         }
         var img = $(".mgmirroricon", mgunit);
         var mir = getMangaMirror(val.mirror);
         if (mir != null) {
            img.attr("src", mir.mirrorIcon);
         } else {
            img.attr("src", chrome.extension.getURL("img/unknown.png"));
         }
         img.attr("title", val.mirror);
         img.click(function () {
            openTab(closestEltData($(this)).data("mgurl"));
         });
         $(".mgname", mgunit).text(val.name);
         $(".mgname", mgunit).click(function () {
            openTab(closestEltData($(this)).data("mgurl"));
         });
         if (val.listChaps.length > 0) {
            $.each(val.listChaps, function (index, valch) {
               if (valch[1] == val.lastChapterReadURL) {
                  $(".latestread", mgunit).text(valch[0]);
               }
            });
         }
         $(".latestread", mgunit).click(function () {
            openTab(closestEltData($(this)).data("mgplay"));
         });
         if (val.listChaps != undefined && val.listChaps.length > 0) {
            $(".latestpub", mgunit).text(val.listChaps[0][0]);
            $(".latestpub", mgunit).click(function () {
               openTab(closestEltData($(this)).data("mglatesturl"));
            });
         }
         var sel = $(".mglist select", mgunit);
         fillChapters(val, sel);
         fillActions(val, $(".mgactions", mgunit), (index == 0));
      });
      if (!mg.hasClass("new")) {
         $(".actreadall", mg).remove();
      }
      addLastUpdate(mangas, $(".mgtitlehead", mg), $(".mgname", mg));
      fillOthers(mangas, mg);
      if (!isMangaDisplayable(mg)) {
         mg.hide();
      }
      mg.appendTo(where);
   } else {
      var mg = $("<div class='manga'><div class='mgactions'></div><div class='mgtitle'><div class='mgtitlehead'><img src='' class='mgmirroricon' /><span class='mgname'></span></div></div><div class='mgtable'><div class='mgline'><div class='label'>Latest chapter read :</div><div class='mglist'><span class='value latestread'></span></div></div><div class='mgline'><div class='label'>Latest chapter published :</div><div class='mglist'><span class='value latestpub'></span></div></div><div class='mgline'><div class='label'>Chapters :</div><div class='mglist'><span class='custom-select'><select></select></span></div></div></div></div>");
      setData(mg, mangas);
      if (isRead) {
         mg.addClass("read");
      } else {
         if (isNew(mangas)) {
            mg.addClass("new");
         }
      }
      if (!isUpdate) {
         mg.addClass("stopupdate");
      }
      var img = $(".mgmirroricon", mg);
      var mir = getMangaMirror(mangas.mirror);
      if (mir != null) {
         img.attr("src", mir.mirrorIcon);
      } else {
         img.attr("src", chrome.extension.getURL("img/unknown.png"));
      }
      img.attr("title", mangas.mirror);
      $(".mgname", mg).text(mangas.name);
      $(".mgname", mg).click(function () {
         openTab(closestEltData($(this)).data("mgurl"));
      });
      if (mangas.listChaps.length > 0) {
         $.each(mangas.listChaps, function (index, val) {
            if (val[1] == mangas.lastChapterReadURL) {
               $(".latestread", mg).text(val[0]);
            }
         });
      }
      $(".latestread", mg).click(function () {
         openTab(closestEltData($(this)).data("mgplay"));
      });
      if (mangas.listChaps.length > 0) {
         $(".latestpub", mg).text(mangas.listChaps[0][0]);
         $(".latestpub", mg).click(function () {
            openTab(closestEltData($(this)).data("mglatesturl"));
         });
      }
      var sel = $(".mglist select", mg);
      fillChapters(mangas, sel);
      addLastUpdate(mangas, $(".mgtitlehead", mg), $(".mgname", mg));
      fillActions(mangas, $(".mgactions", mg), true);
      fillOthers(mangas, mg);
      if (!isMangaDisplayable(mg)) {
         mg.hide();
      }
      mg.appendTo(where);
   }
}
function createMangaEntry(mangas, where) {
   if (parameters.popupMode == 1) {
      createMangaEntryBlock(mangas, where);
   } else {
      createMangaEntryList(mangas, where);
   }
}
function sortByNewShortName(lst) {
   lst.sort(function (aG, bG) {
      var a,
      b;
      if (aG.length) {
         a = aG[0];
      } else {
         a = aG;
      }
      if (bG.length) {
         b = bG[0];
      } else {
         b = bG;
      }
      var isNewA = isNew(a);
      var isNewB = isNew(b);
      if (isNewA && !isNewB)
         return -1;
      if (!isNewA && isNewB)
         return 1;
      if (!a.shortName)
         a.shortName = formatMgName(a.name);
      if (!b.shortName)
         b.shortName = formatMgName(b.name);
      if (a.shortName == b.shortName) {
         if (a.mirror == b.mirror)
            return 0;
         else if (a.mirror > b.mirror)
            return 1;
         else
            return -1;
      } else {
         if (a.shortName > b.shortName)
            return 1;
         else
            return -1;
      }
   });
}
function sortByShortName(lst) {
   lst.sort(function (a, b) {
      if (!a.shortName)
         a.shortName = formatMgName(a.name);
      if (!b.shortName)
         b.shortName = formatMgName(b.name);
      if (a.shortName == b.shortName) {
         if (a.mirror == b.mirror)
            return 0;
         else if (a.mirror > b.mirror)
            return 1;
         else
            return -1;
      } else {
         if (a.shortName > b.shortName)
            return 1;
         else
            return -1;
      }
   });
}
function sortByNewMirror(lst) {
   lst.sort(function (a, b) {
      var isNewA = isNew(a);
      var isNewB = isNew(b);
      if (isNewA && !isNewB)
         return -1;
      if (!isNewA && isNewB)
         return 1;
      return (a.mirror < b.mirror) ? -1 : ((a.mirror == b.mirror) ? 0 : 1);
   });
}
function loadMangas() {
   var main = $("#main");
   if (parameters.popupMode == 1) {
      main.addClass("block");
   } else {
      main.addClass("list");
   }
   if (mangas.length == 0) {
      $("#nomangas").show();
      return;
   } else {
      $("#nomangas").hide();
   }
   if (parameters.groupmgs == 0) {
      sortByNewShortName(mangas);
      $.each(mangas, function (index, val) {
         try {
            createMangaEntry(val, main);
         } catch (e) {}
         
      });
   } else {
      sortByShortName(mangas);
      var mangasGrps = [];
      var ancShName;
      var mgTemp = [];
      for (var i = 0; i < mangas.length; i++) {
         if (!(!ancShName || mangas[i].shortName == ancShName)) {
            if (mgTemp.length == 1) {
               mangasGrps[mangasGrps.length] = mgTemp[0];
            } else {
               sortByNewMirror(mgTemp);
               var pos = mangasGrps.length;
               mangasGrps[pos] = [];
               $.each(mgTemp, function (index, val) {
                  mangasGrps[pos][index] = val;
               });
            }
            mgTemp = [];
         }
         mgTemp[mgTemp.length] = mangas[i];
         ancShName = mangas[i].shortName;
      }
      if (mgTemp.length == 1) {
         mangasGrps[mangasGrps.length] = mgTemp[0];
      } else {
         sortByNewMirror(mgTemp);
         var pos = mangasGrps.length;
         mangasGrps[pos] = [];
         $.each(mgTemp, function (index, val) {
            mangasGrps[pos][index] = val;
         });
      }
      sortByNewShortName(mangasGrps);
      $.each(mangasGrps, function (index, val) {
         try {
            createMangaEntry(val, main);
         } catch (e) {}
         
      });
   }
}
function firstLastMg() {
   $(".manga:visible").removeClass("first");
   $(".manga:visible").removeClass("last");
   $(".manga:visible:first").addClass("first");
   $(".manga:visible:last").addClass("last");
   if ($(".manga:visible").size() == 0) {
      $("#nomangas").show();
      return;
   } else {
      $("#nomangas").hide();
   }
}
function setColor() {
   if (parameters.color == 0) {
      $("body").css("background-color", "white");
   }
   if (parameters.color == 1) {
      $("body").css("background-color", "black");
      $("#header h3").css("color", "white");
      $("#nomangas").css("color", "white");
      $("#firstSearch").css("color", "white");
      $("#search").css("color", "white");
   }
   if (parameters.color == 2) {
      $("body").css("background-color", "#DDDDDD");
   }
   if (parameters.color == 3) {
      $("body").css("background-color", "#F0DDDD");
   }
   if (parameters.color == 4) {
      $("body").css("background-color", "#EEEEFF");
   }
}
$(function () {
   parameters = chrome.extension.getBackgroundPage().getParameters();
   if (parameters.size == 2) {
      $("body").addClass("medium");
   }
   if (parameters.size == 3) {
      $("body").addClass("big");
   }
   var url = window.location.href;
   if (url.indexOf("?mode=normal") != -1) {
      $("body").children().wrapAll("<div id='tabCont'></div>");
      $("#tabCont").css("margin-left", "auto");
      $("#tabCont").css("margin-right", "auto");
      $("#tabCont").css("max-width", "800px");
      $("body").css("max-width", "none");
      $("#search #allres").css("overflow", "hidden");
      $("#search #allres").css("max-height", "none");
      $("#main").css("max-height", "none");
      $("#external").hide();
      $("#header").addClass("externHeader");
      $("#mangaList").addClass("externMangaList");
      $("#footer").addClass("externFooter");
      $("#main").addClass("externMain");
      $("#footact").addClass("externFootact");
      $("#search").addClass("externSearch");
      init();
   } else {
      if (parameters.newTab == 0) {
         init();
      } else {
         openTab("/popup.html?mode=normal");
      }
   }
    $("#searchBoxInput").keypress(function (e) {
       var key = e.keyCode || e.which;
       if (key == 13) {
          search();
       }
    });
    $("#butFind").click(function (e) {
       search();
    });
});
function init() {
   setTimeout(function () {
      wssql.init();
      mirrors = chrome.extension.getBackgroundPage().actMirrors;
      mangas = chrome.extension.getBackgroundPage().mangaList;
      bookmarks = chrome.extension.getBackgroundPage().bookmarks;
      setColor();
      loadCategories();
      loadMangas();
      setTimeout(function () {
         loadSearch();
      }, 10);
      firstLastMg();
      bindCategories();
      displayMangasByCat();
      saveCategories();
      if (!localStorage["versionViewRelease"] || localStorage["versionViewRelease"] != localStorage["version"]) {
         $("#release").css("display", "inline-block");
      }
      if (parameters.dev == 1) {
         $("#dev").css("display", "inline-block");
      }
      bindFoot();
      bindActions();
   }, 5);
}
function isMangaDisplayable(mg) {
   var isInclude = false;
   var isExclude = false;
   var isNew = $(mg).hasClass("new");
   var isRead = $(mg).hasClass("read");
   var elts;
   if (isInGroup($(".mgtitle:first", $(mg)))) {
      if (isList()) {
         elts = $(".mgline", $(mg));
      } else {
         elts = $(".mgelt", $(mg));
      }
   } else {
      elts = $(mg);
   }
   var isOneShot = true;
   elts.each(function (index) {
      if (!$(this).data("mgoneshot")) {
         isOneShot = false;
      }
   });
   $(".category.native").each(function (index) {
      if ($(this).text() == "New" && $(this).hasClass("include")) {
         if (isNew)
            isInclude = true;
      }
      if ($(this).text() == "Read" && $(this).hasClass("include")) {
         if (!isRead && !isNew)
            isInclude = true;
      }
      if ($(this).text() == "Unread" && $(this).hasClass("include")) {
         if (isRead || isNew)
            isInclude = true;
      }
      if ($(this).text() == "One Shots" && $(this).hasClass("include")) {
         if (isOneShot)
            isInclude = true;
      }
      if ($(this).text() == "New" && $(this).hasClass("exclude")) {
         if (isNew)
            isExclude = true;
      }
      if ($(this).text() == "Read" && $(this).hasClass("exclude")) {
         if (!isRead && !isNew)
            isExclude = true;
      }
      if ($(this).text() == "Unread" && $(this).hasClass("exclude")) {
         if (isRead || isNew)
            isExclude = true;
      }
      if ($(this).text() == "One Shots" && $(this).hasClass("exclude")) {
         if (isOneShot)
            isExclude = true;
      }
   });
   $(".category.user").each(function (index) {
      var _selfCat = this;
      var found = false;
      $(".mginfos .cats .mgcategory", $(mg)).each(function (index) {
         if ($(this).text() == $(_selfCat).text()) {
            found = true;
         }
      });
      if (found) {
         if ($(this).hasClass("include")) {
            isInclude = true;
         }
         if ($(this).hasClass("exclude")) {
            isExclude = true;
         }
      }
   });
   if (isInclude && !isExclude) {
      return true;
   } else {
      return false;
   }
}
function displayMangasByCat() {
   $(".manga").each(function (index) {
      if (isMangaDisplayable($(this))) {
         if (!$(this).is(":visible")) {
            $(this).toggle("blind", {}, 250);
         }
      } else {
         if ($(this).is(":visible")) {
            $(this).toggle("blind", {}, 250);
         }
      }
   });
   if ($(".manga:visible").size() == 0) {
      $("#nomangas").show();
      return;
   } else {
      $("#nomangas").hide();
   }
   setTimeout(function () {
      if ($(".manga:visible").size() == 0) {
         $("#nomangas").show();
         return;
      } else {
         $("#nomangas").hide();
      }
   }, 300);
}
function dragCatManga(mg, _cat) {
   if (isInGroup(mg)) {
      var obj = {
         action : "addCategories",
         list : []
      };
      if (isList()) {
         $(".mgline", mg.closest(".manga")).each(function (index) {
            obj.list[obj.list.length] = {
               url : $(this).data("mgurl"),
               cat : $(_cat).text()
            };
         });
      } else {
         $(".mgelt", mg.closest(".manga")).each(function (index) {
            obj.list[obj.list.length] = {
               url : $(this).data("mgurl"),
               cat : $(_cat).text()
            };
         });
      }
      sendExtRequest(obj, $(_cat), function () {
         var isFound = false;
         $(".mginfos .cats .mgcategory", $(mg).closest(".manga")).each(function (index) {
            if ($(this).text() == $(_cat).text()) {
               isFound = true;
            }
         });
         if (!isFound) {
            if ($(".mginfos .cats .mgcategory", $(mg).closest(".manga")).size() == 0) {
               $(".mginfos .cats", $(mg).closest(".manga")).empty();
            }
            $("<div class='mgcategory'>" + $(_cat).text() + "<img class='actcatmgdel' src='img/delete10.png' title='Delete this category from this manga' /></div>").appendTo($(".mginfos .cats", $(mg).closest(".manga")));
            bindCatsButtons();
         }
         if (isMangaDisplayable($(mg).closest(".manga"))) {
            if (!$(mg).closest(".manga").is(":visible")) {
               $(mg).closest(".manga").toggle("blind", {}, 250);
            }
         } else {
            if ($(mg).closest(".manga").is(":visible")) {
               $(mg).closest(".manga").toggle("blind", {}, 250);
            }
         }
      });
   } else {
      var obj = {
         action : "addCategory",
         cat : $(_cat).text(),
         url : mg.closest(".manga").data("mgurl")
      };
      sendExtRequest(obj, $(_cat), function () {
         var isFound = false;
         $(".mginfos .cats .mgcategory", $(mg).closest(".manga")).each(function (index) {
            if ($(this).text() == $(_cat).text()) {
               isFound = true;
            }
         });
         if (!isFound) {
            if ($(".mginfos .cats .mgcategory", $(mg).closest(".manga")).size() == 0) {
               $(".mginfos .cats", $(mg).closest(".manga")).empty();
            }
            $("<div class='mgcategory'>" + $(_cat).text() + "<img class='actcatmgdel' src='img/delete10.png' title='Delete this category from this manga' /></div>").appendTo($(".mginfos .cats", $(mg).closest(".manga")));
            bindCatsButtons();
         }
         if (isMangaDisplayable($(mg).closest(".manga"))) {
            if (!$(mg).closest(".manga").is(":visible")) {
               $(mg).closest(".manga").toggle("blind", {}, 250);
            }
         } else {
            if ($(mg).closest(".manga").is(":visible")) {
               $(mg).closest(".manga").toggle("blind", {}, 250);
            }
         }
      });
   }
}
function bindCategories() {
   $(".category.include").each(function (ind) {
      $(this).attr("title", "All mangas in category " + $(this).text() + " are included in the list.");
   });
   $(".category.exclude").each(function (ind) {
      $(this).attr("title", "All mangas in category " + $(this).text() + " are excluded from the list.");
   });
   $(".category:not(.addcategory):not(.newcat):not(.include):not(.exclude)").each(function (ind) {
      $(this).attr("title", "Click here to exlude / include mangas from this category.");
   });
   $(".category:not(.addcategory)").unbind();
   $(".category:not(.addcategory)").click(function () {
      if ($(this).hasClass("include")) {
         $(this).removeClass("include");
         $(this).addClass("exclude");
         $(this).attr("title", "All mangas in category " + $(this).text() + " are excluded from the list.");
      } else if ($(this).hasClass("exclude")) {
         $(this).removeClass("include");
         $(this).removeClass("exclude");
         $(this).attr("title", "Click here to exlude / include mangas from this category.");
      } else {
         $(this).addClass("include");
         $(this).removeClass("exclude");
         $(this).attr("title", "All mangas in category " + $(this).text() + " are included in the list.");
      }
      displayMangasByCat();
      saveCategories();
   });
   $(".addcategory").unbind();
   $(".addcategory").click(function () {
      var newCat = $("<li class='category newcat'><input type='text' value='New Category'/></li>");
      $(this).before(newCat);
      $("input", newCat).focus();
      $("input", newCat).keydown(function (event) {
         if (event.which == 13) {
            var _par = $(this).parent();
            _par.removeClass("newcat").addClass("user").text($(this).val());
            var imgs = $("<img src='img/list10.gif' class='actcatview' title='View only mangas from this category'/><img src='img/edit10.png' class='actcatedit' title='Edit this category'/><img src='img/delete10.png' class='actcatdelete' title='Delete this category'/>");
            imgs.appendTo(_par);
            bindCatsButtons();
            $(this).remove();
            bindCategories();
            saveCategories();
         }
      });
      $("input", newCat).blur(function () {
         $(this).parent().remove();
      });
   });
   $(".mgtitlehead").draggable({
      revert : true,
      revertDuration : 0,
      opacity : 0.5,
      helper : 'clone',
      handle : 'img',
      scroll : false
   });
   $(".category.user").droppable({
      accept : '.mgtitlehead',
      hoverClass : 'drop',
      tolerance : 'pointer',
      drop : function (event, ui) {
         dragCatManga($(ui.draggable), $(this));
      }
   });
   $(".category.user").draggable({
      revert : true,
      revertDuration : 0,
      opacity : 0.5,
      helper : 'clone',
      scroll : false
   });
   $(".manga").droppable({
      accept : '.category.user',
      hoverClass : 'drop',
      tolerance : 'pointer',
      drop : function (event, ui) {
         console.log($(".mgtitlehead:first", $(this)));
         console.log($(ui.draggable));
         dragCatManga($(".mgtitlehead:first", $(this)), $(ui.draggable));
      }
   });
}
function bindActions() {
   $("#mgSearchBtn").unbind();
   $("#mgSearchBtn").add($("#mgListBtn")).click(function () {
      if (!$(this).hasClass("checked")) {
         $("#mgListBtn").toggleClass("checked");
         $("#mgSearchBtn").toggleClass("checked");
         $("#mangaList").toggle("blind", {}, 500);
         $("#search").toggle("blind", {}, 500);
      }
   });
   $("#firstSearch").unbind();
   $("#firstSearch").click(function () {
      $("#mgListBtn").removeClass("checked");
      $("#mgSearchBtn").addClass("checked");
      $("#mangaList").toggle("blind", {}, 500);
      $("#search").toggle("blind", {}, 500);
   });
   $("#dev").unbind();
   $("#dev").click(function () {
      openTab("lab.html");
   });
   $("#searchLnk").unbind();
   $("#searchLnk").click(function () {
      openTab("search.html");
   });
   $("#bookmarks").unbind();
   $("#bookmarks").click(function () {
      openTab("bookmarks.html");
   });
   $("#infos").unbind();
   $("#infos").click(function () {
      openTab("faq.html");
   });
   $("#home").unbind();
   $("#home").click(function () {
      chrome.extension.sendRequest({
         action : "openExtensionMainPage"
      }, function (response) {});
   });
   $("#options").unbind();
   $("#options").click(function () {
      openTab("options.html");
   });
   $("#release").unbind();
   $("#release").click(function () {
      chrome.extension.sendRequest({
         action : "opentab",
         url : "/release.html"
      }, function (response) {
         localStorage["versionViewRelease"] = localStorage["version"];
      });
   });
   bindMultipleMgs();
   $(".clipoths").unbind();
   $(".clipoths").click(function () {
      if ($(this).attr("src") == chrome.extension.getURL("img/up_der.png")) {
         $(this).attr("src", chrome.extension.getURL("img/down_der.png"));
      } else {
         $(this).attr("src", chrome.extension.getURL("img/up_der.png"));
      }
      $(this).closest(".manga").children(".mgothers").each(function (index) {
         if ($(this).is(":visible") && !$(this).hasClass(".buttons")) {
            $(this).toggle("blind", {}, 500);
         }
      });
      $(this).closest(".manga").children(".buttons").toggle("blind", {}, 500);
   });
   $(".deletemg").unbind();
   $(".deletemg").click(function () {
      var quest = "Are you sure to delete this manga (" + closestEltData($(this)).data("mgname") + " on " + closestEltData($(this)).data("mgmirror") + ") ?";
      $("span:first", $(this).closest(".manga").children(".question")).text(quest);
      $(this).closest(".manga").children(".mgothers").each(function (index) {
         if ($(this).is(":visible") && !$(this).hasClass(".question")) {
            $(this).toggle("blind", {}, 500);
            if ($(this).is(".buttons")) {
               $(".clipoths", $(this).closest(".manga")).attr("src", chrome.extension.getURL("img/down_der.png"));
            }
         }
      });
      $(".yes", $(this).closest(".manga").children(".question")).data("mgsingle", true);
      $(".yes", $(this).closest(".manga").children(".question")).data("mgurl", closestEltData($(this)).data("mgurl"));
      $(".yes", $(this).closest(".manga").children(".question")).data("mgmirror", closestEltData($(this)).data("mgmirror"));
      $(".yes", $(this).closest(".manga").children(".question")).data("mgname", closestEltData($(this)).data("mgname"));
      $(".yes", $(this).closest(".manga").children(".question")).data("btnDel", $(this));
      $(this).closest(".manga").children(".question").toggle("blind", {}, 500);
   });
   $(".actdeleteall").unbind();
   $(".actdeleteall").click(function () {
      var quest = "Are you sure to delete all these manga (" + getFirstElementOfGroup($(this)).data("mgname") + ", " + nbOfGroup($(this)) + " mangas to delete) ?";
      $("span:first", $(this).closest(".manga").children(".question")).text(quest);
      $(this).closest(".manga").children(".mgothers").each(function (index) {
         if ($(this).is(":visible") && !$(this).hasClass(".question")) {
            $(this).toggle("blind", {}, 500);
         }
      });
      $(".yes", $(this).closest(".manga").children(".question")).data("mgsingle", false);
      $(".yes", $(this).closest(".manga").children(".question")).data("btnDel", $(this));
      $(this).closest(".manga").children(".question").toggle("blind", {}, 500);
   });
   $(".actplay").unbind();
   $(".actplay").click(actionPlay);
   $(".actback").unbind();
   $(".actback").click(actionBack);
   $(".actfor").unbind();
   $(".actfor").click(actionForward);
   $(".actend").unbind();
   $(".actend").click(actionEnd);
   bindRead();
   bindReadAll();
   $(".question .yes").unbind();
   $(".question .yes").click(function () {
      if ($(this).data("mgsingle")) {
         var obj = {
            action : "killManga",
            url : $(this).data("mgurl"),
            name : $(this).data("mgname")
         };
         var _self = this;
         sendExtRequest(obj, $(this), function () {
            if ($(_self).data("mgmirror")) {
               $(".books select option", $(_self).closest(".manga")).each(function (index) {
                  if ($(this).data("bmmirror") == $(_self).data("mgmirror")) {
                     $(this).remove();
                  }
               });
               $(".books select optgroup", $(_self).closest(".manga")).each(function (index) {
                  if ($(this).is(":empty")) {
                     $(this).remove();
                  }
               });
               if ($(".books select optgroup", $(_self).closest(".manga")).size() == 0) {
                  $(".books", $(_self).closest(".manga")).html("No bookmarks for this manga");
               }
            }
            removeMangaParent($($(_self).data("btnDel")));
            $(_self).closest(".manga").children(".question").toggle("blind", {}, 500);
         });
      } else {
         var obj = {
            action : "killMangas",
            list : []
         };
         if (isList()) {
            $(".mgline", $(this).closest(".manga")).each(function (index) {
               obj.list[obj.list.length] = {
                  url : $(this).data("mgurl"),
                  name : $(this).data("mgname")
               };
            });
         } else {
            $(".mgelt", $(this).closest(".manga")).each(function (index) {
               obj.list[obj.list.length] = {
                  url : $(this).data("mgurl"),
                  name : $(this).data("mgname")
               };
            });
         }
         var _self = this;
         sendExtRequest(obj, $(this), function () {
            $(_self).closest(".manga").toggle("blind", {}, 500, function () {
               $(this).remove();
               firstLastMg();
            });
         });
      }
   });
   $(".question .no").unbind();
   $(".question .no").click(function () {
      $(this).closest(".manga").children(".question").toggle("blind", {}, 500);
   });
   $(".actsearchmg").unbind();
   $(".actsearchmg").click(function () {
      $("#searchBoxInput").val($(".mgname", $(this).closest(".manga")).text());
      $("#mgListBtn").toggleClass("checked");
      $("#mgSearchBtn").toggleClass("checked");
      $("#mangaList").toggle("blind", {}, 500);
      $("#search").toggle("blind", {}, 500);
      search();
   });
   $(".actresetreading").unbind();
   $(".actresetreading").click(function () {
      var quest = "Are you sure to reset your reading state for this manga (" + closestEltData($(this)).data("mgname") + ") ?";
      $("span:first", $(this).closest(".manga").children(".questionreset")).text(quest);
      $(this).closest(".manga").children(".mgothers").each(function (index) {
         if ($(this).is(":visible") && !$(this).hasClass(".questionreset")) {
            $(this).toggle("blind", {}, 500);
            if ($(this).is(".buttons")) {
               $(".clipoths", $(this).closest(".manga")).attr("src", chrome.extension.getURL("img/down_der.png"));
            }
         }
      });
      $(".yes", $(this).closest(".manga").children(".questionreset")).data("btnReset", $(this));
      $(this).closest(".manga").children(".questionreset").toggle("blind", {}, 500);
   });
   $(".questionreset .yes").unbind();
   $(".questionreset .yes").click(function () {
      var _btn = $($(this).data("btnReset"));
      if (!isInGroup(_btn)) {
         var obj = {
            action : "resetManga",
            url : closestEltData($(this)).data("mgurl"),
            name : closestEltData($(this)).data("mgname")
         };
         var _self = this;
         sendExtRequest(obj, $(this), function () {
            var isNew = false;
            $(".mglist select", $(_self).closest(".manga")).each(function (index) {
               closestEltData($(this)).data("mgplay", $("option:last", $(this)).val());
               $(this).val($("option:last", $(this)).val());
               if ($("option", $(this)).size() > 1) {
                  isNew = true;
                  if (!closestEltData($(this)).hasClass("read")) {
                     closestEltData($(this)).addClass("new");
                     $(".actblank", closestEltData($(this))).removeClass("actblank").addClass("actread");
                     $(".actread", closestEltData($(this))).attr("src", chrome.extension.getURL("img/eye.png"));
                  }
               }
            });
            bindRead();
            if (!$(_self).closest(".manga").hasClass("read")) {
               if (isNew) {
                  $(_self).closest(".manga").addClass("new");
                  moveMangaParentNew($(_self));
               }
            }
            updateProgression($(_self));
            $(_self).closest(".manga").children(".questionreset").toggle("blind", {}, 500);
         });
      } else {
         var obj = {
            action : "resetMangas",
            list : []
         };
         if (isList()) {
            $(".mgline", $(this).closest(".manga")).each(function (index) {
               obj.list[obj.list.length] = {
                  url : $(this).data("mgurl"),
                  name : $(this).data("mgname")
               };
            });
         } else {
            $(".mgelt", $(this).closest(".manga")).each(function (index) {
               obj.list[obj.list.length] = {
                  url : $(this).data("mgurl"),
                  name : $(this).data("mgname")
               };
            });
         }
         var _self = this;
         sendExtRequest(obj, $(this), function () {
            var isNew = false;
            $(".mglist select", $(_self).closest(".manga")).each(function (index) {
               closestEltData($(this)).data("mgplay", $("option:last", $(this)).val());
               $(this).val($("option:last", $(this)).val());
               if ($("option", $(this)).size() > 1) {
                  isNew = true;
                  if (!closestEltData($(this)).hasClass("read")) {
                     closestEltData($(this)).addClass("new");
                     $(".actblank", closestEltData($(this))).removeClass("actblank").addClass("actread");
                     $(".actread", closestEltData($(this))).attr("src", chrome.extension.getURL("img/eye.png"));
                  }
               }
            });
            bindRead();
            if (!$(_self).closest(".manga").hasClass("read")) {
               if (isNew) {
                  $(_self).closest(".manga").addClass("new");
                  moveMangaParentNew($(_self));
                  $(".mgtitleheadpics", $(_self).closest(".manga")).prepend($("<img src='img/eyes.png' class='actreadall' title='Mark all manga from this group as read' />"));
                  bindReadAll();
               }
            }
            updateProgression($(_self));
            $(_self).closest(".manga").children(".questionreset").toggle("blind", {}, 500);
         });
      }
   });
   $(".questionreset .no").unbind();
   $(".questionreset .no").click(function () {
      $(this).closest(".manga").children(".questionreset").toggle("blind", {}, 500);
   });
   $(".actstopupdates").unbind();
   $(".actstopupdates").click(function () {
      var readToSend = 1;
      if ($(this).closest(".manga").is(".read")) {
         readToSend = 0;
         $(this).text("Stop following updates");
      } else {
         $(this).text("Follow updates");
      }
      if (isInGroup($(this))) {
         var obj = {
            action : "markReadTops",
            list : []
         };
         if (isList()) {
            $(".mgline", $(this).closest(".manga")).each(function (index) {
               obj.list[obj.list.length] = {
                  read : readToSend,
                  url : $(this).data("mgurl")
               };
            });
         } else {
            $(".mgelt", $(this).closest(".manga")).each(function (index) {
               obj.list[obj.list.length] = {
                  read : readToSend,
                  url : $(this).data("mgurl")
               };
            });
         }
         var _self = this;
         sendExtRequest(obj, $(this), function () {
            if (readToSend == 0) {
               $(_self).closest(".manga").removeClass("read");
               var isNew = false;
               if (isList()) {
                  $(".mgline", $(_self).closest(".manga")).each(function (index) {
                     $(this).removeClass("read");
                     if ($(this).data("mglatesturl") != $(this).data("mgplay")) {
                        isNew = true;
                        $(this).addClass("new");
                        $(".actblank", $(this)).removeClass("actblank").addClass("actread");
                        $(".actread", $(this)).attr("src", chrome.extension.getURL("img/eye.png"));
                        if ($(this).prev().size() != 0) {
                           var wasVisible = $(this).is(":visible");
                           var _first = $(".mgline:first", $(_self).closest(".manga"));
                           switchHeader(_first, $(this));
                           $(this).after(_first);
                           if (!wasVisible) {
                              _first.hide();
                           }
                        }
                     }
                  });
                  bindRead();
               } else {
                  $(".mgelt", $(_self).closest(".manga")).each(function (index) {
                     $(this).removeClass("read");
                     if ($(this).data("mglatesturl") != $(this).data("mgplay")) {
                        isNew = true;
                        $(this).addClass("new");
                        $(".actblank", $(this)).removeClass("actblank").addClass("actread");
                        $(".actread", $(this)).attr("src", chrome.extension.getURL("img/eye.png"));
                        if ($(this).prev().size() != 0) {
                           var wasVisible = $(this).is(":visible");
                           var _first = $(".mgelt:first", $(_self).closest(".manga"));
                           switchHeader(_first, $(this));
                           $(this).after(_first);
                           if (!wasVisible) {
                              _first.hide();
                           }
                        }
                     }
                  });
                  bindRead();
               }
               if (isNew) {
                  $(_self).closest(".manga").addClass("new");
                  moveMangaParentNew($(_self));
                  $(".mgtitleheadpics", $(_self).closest(".manga")).prepend($("<img src='img/eyes.png' class='actreadall' title='Mark all manga from this group as read' />"));
                  bindReadAll();
               }
            } else {
               if (isList()) {
                  $(".mgline", $(_self).closest(".manga")).each(function (index) {
                     if ($(this).is(".new")) {
                        $(this).removeClass("new");
                        $(".actread", $(this)).attr("src", chrome.extension.getURL("img/blank.png"));
                        $(".actread", $(this)).unbind("click");
                     }
                     $(this).addClass("read");
                  });
               } else {
                  $(".mgelt", $(_self).closest(".manga")).each(function (index) {
                     if ($(this).is(".new")) {
                        $(this).removeClass("new");
                        $(".actread", $(this)).attr("src", chrome.extension.getURL("img/blank.png"));
                        $(".actread", $(this)).unbind("click");
                     }
                     $(this).addClass("read");
                  });
               }
               if ($(_self).closest(".manga").is(".new")) {
                  $(_self).closest(".manga").removeClass("new");
                  moveMangaParent($(_self));
                  $(".actreadall", $(_self).closest(".manga")).remove();
               }
               $(_self).closest(".manga").addClass("read");
            }
         });
      } else {
         var obj = {
            action : "markReadTop",
            read : readToSend,
            url : closestEltData($(this)).data("mgurl")
         };
         var _self = this;
         sendExtRequest(obj, $(this), function () {
            if (readToSend == 0) {
               $(_self).closest(".manga").removeClass("read");
               if ($(_self).closest(".manga").data("mglatesturl") != $(_self).closest(".manga").data("mgplay")) {
                  $(_self).closest(".manga").addClass("new");
                  moveMangaParentNew($(_self));
                  $(".actread", $(_self).closest(".manga")).attr("src", chrome.extension.getURL("img/eye.png"));
                  bindRead();
               }
            } else {
               if ($(_self).closest(".manga").is(".new")) {
                  $(_self).closest(".manga").removeClass("new");
                  moveMangaParent($(_self));
                  $(".actread", $(_self).closest(".manga")).attr("src", chrome.extension.getURL("img/blank.png"));
                  $(".actread", $(_self).closest(".manga")).unbind("click");
               }
               $(_self).closest(".manga").addClass("read");
            }
         });
      }
   });
   $(".actstopupdating").unbind();
   $(".actstopupdating").click(function () {
      var updateToSend = 0;
      if ($(this).closest(".manga").is(".stopupdate")) {
         updateToSend = 1;
         $(this).text("Stop updating");
      } else {
         $(this).text("Continue updates");
      }
      if (isInGroup($(this))) {
         var obj = {
            action : "markUpdateTops",
            list : []
         };
         if (isList()) {
            $(".mgline", $(this).closest(".manga")).each(function (index) {
               obj.list[obj.list.length] = {
                  update : updateToSend,
                  url : $(this).data("mgurl")
               };
            });
         } else {
            $(".mgelt", $(this).closest(".manga")).each(function (index) {
               obj.list[obj.list.length] = {
                  update : updateToSend,
                  url : $(this).data("mgurl")
               };
            });
         }
         var _self = this;
         sendExtRequest(obj, $(this), function () {
            if (updateToSend == 0) {
               $(_self).closest(".manga").addClass("stopupdate");
            } else {
               $(_self).closest(".manga").removeClass("stopupdate");
            }
         });
      } else {
         var obj = {
            action : "markUpdateTop",
            update : updateToSend,
            url : closestEltData($(this)).data("mgurl")
         };
         var _self = this;
         sendExtRequest(obj, $(this), function () {
            if (updateToSend == 0) {
               $(_self).closest(".manga").addClass("stopupdate");
            } else {
               $(_self).closest(".manga").removeClass("stopupdate");
            }
         });
      }
   });
}
function bindMultipleMgs() {
   $(".multiplemgs").unbind();
   $(".multiplemgs").click(function () {
      if (isList()) {
         $(".mgline.next", $(this).closest(".manga")).toggle();
         if ($(".mgline.next:first", $(this).closest(".manga")).is(":visible")) {
            $(this).attr("src", chrome.extension.getURL("img/minus.png"));
         } else {
            $(this).attr("src", chrome.extension.getURL("img/plus.png"));
         }
      } else {
         var _self = this;
         $(".mgelt.next", $(this).closest(".manga")).toggle("blind", {}, 250, function () {
            if ($(".mgelt.next:first", $(_self).closest(".manga")).is(":visible")) {
               $(_self).attr("src", chrome.extension.getURL("img/minus.png"));
            } else {
               $(_self).attr("src", chrome.extension.getURL("img/plus.png"));
            }
         });
      }
   });
}
function bindRead() {
   $(".actread").unbind();
   $(".actread").click(actionRead);
}
function bindReadAll() {
   $(".actreadall").unbind();
   $(".actreadall").click(function () {
      var obj = {
         action : "readMangas",
         list : []
      };
      if (isList()) {
         $(".mgline", $(this).closest(".manga")).each(function (index) {
            obj.list[obj.list.length] = {
               url : $(this).data("mgurl"),
               lastChapterReadURL : $(this).data("mglatesturl")
            };
         });
      } else {
         $(".mgelt", $(this).closest(".manga")).each(function (index) {
            obj.list[obj.list.length] = {
               url : $(this).data("mgurl"),
               lastChapterReadURL : $(this).data("mglatesturl")
            };
         });
      }
      var _self = this;
      sendExtRequest(obj, $(this), function () {
         $(_self).closest(".manga").removeClass("new");
         $(".actread", $(_self).closest(".manga")).unbind("click");
         $(".actread", $(_self).closest(".manga")).attr("src", chrome.extension.getURL("img/blank.png"));
         if (isList()) {
            $(".mgline", $(_self).closest(".manga")).removeClass("new");
         } else {
            $(".mgelt", $(_self).closest(".manga")).removeClass("new");
         }
         $(".mglist select", $(_self).closest(".manga")).each(function (index) {
            closestEltData($(this)).data("mgplay", $("option:first", $(this)).val());
            $(this).val($("option:first", $(this)).val());
         });
         moveMangaParent($(_self));
         updateProgression($(_self));
         $(_self).remove();
      }, false);
   });
}
function loadCategories() {
   var categs = [];
   if (localStorage["categoriesStates"] != undefined) {
      try {
         var catsStates = JSON.parse(localStorage["categoriesStates"]);
         $.each(catsStates, function (index, catSt) {
            var isfound = false;
            $.each(categs, function (index, cat) {
               if (catSt.name == cat.name) {
                  cat.state = catSt.state;
                  isfound = true;
               }
            });
            if (!isfound) {
               if (catSt.type == "user") {
                  categs[categs.length] = {
                     name : catSt.name,
                     state : catSt.state
                  };
               } else {
                  $(".category.native").each(function (index) {
                     if ($(this).text() == catSt.name) {
                        $(this).removeClass("include");
                        $(this).removeClass("exclude");
                        $(this).addClass(catSt.state);
                     }
                  });
               }
            }
         });
      } catch (e) {}
      
   }
   $.each(mangas, function (index, val) {
      $.each(val.cats, function (index, catmg) {
         var isfound = false;
         $.each(categs, function (index, cat) {
            if (catmg == cat.name) {
               isfound = true;
            }
         });
         if (!isfound) {
            categs[categs.length] = {
               name : catmg,
               state : ""
            };
         }
      });
   });
   $.each(categs, function (index, cat) {
      $(".addcategory").before($("<li class='category user " + cat.state + "'>" + cat.name + "<img src='img/list10.gif' class='actcatview' title='View only mangas from this category'/><img src='img/edit10.png' class='actcatedit' title='Edit this category'/><img src='img/delete10.png' class='actcatdelete' title='Delete this category'/></li>"));
   });
   bindCatsButtons();
}
function bindCatsButtons() {
   $(".actcatview").unbind();
   $(".actcatview").click(function (event) {
      $(".category:not(.addcategory):not(.newcat)").removeClass("include").removeClass("exclude");
      $(this).parent().addClass("include");
      displayMangasByCat();
      saveCategories();
      event.stopImmediatePropagation();
   });
   $(".actcatedit").unbind();
   $(".actcatedit").click(function (event) {
      var _par = $(this).parent();
      var cat = _par.text();
      _par.data("anccat", cat);
      _par.empty();
      _par.unbind();
      var inp = $("<input type='text' value='" + cat + "'/>");
      inp.appendTo(_par);
      inp.focus();
      inp.blur(function () {
         var _par = $(this).parent();
         _par.text(_par.data("anccat"));
         var imgs = $("<img src='img/list10.gif' class='actcatview' title='View only mangas from this category'/><img src='img/edit10.png' class='actcatedit' title='Edit this category'/><img src='img/delete10.png' class='actcatdelete' title='Delete this category'/>");
         imgs.appendTo(_par);
         bindCatsButtons();
         $(this).remove();
         bindCategories();
      });
      inp.keydown(function (event) {
         if (event.which == 13) {
            var obj = {
               action : "editCategory",
               cat : $(this).parent().data("anccat"),
               newcat : $(this).val()
            };
            var _par = $(this).parent();
            var _self = this;
            sendExtRequest(obj, _par, function () {
               var newcat = $(_self).val();
               var anccat = $(_par).data("anccat");
               _par.text(newcat);
               var imgs = $("<img src='img/list10.gif' class='actcatview' title='View only mangas from this category'/><img src='img/edit10.png' class='actcatedit' title='Edit this category'/><img src='img/delete10.png' class='actcatdelete' title='Delete this category'/>");
               imgs.appendTo(_par);
               $(_self).remove();
               $(".mgcategory").each(function (index) {
                  if ($(this).text() == anccat) {
                     $(this).text(newcat);
                     $("<img class='actcatmgdel' src='img/delete10.png' title='Delete this category from this manga' />").appendTo($(this));
                  }
               });
               bindCatsButtons();
               bindCategories();
               saveCategories();
            });
         }
      });
      event.stopImmediatePropagation();
   });
   $(".actcatdelete").unbind();
   $(".actcatdelete").click(function () {
      var catTxt = $(this).parent().text();
      var nbmgs = 0;
      $(".mgcategory").each(function (index) {
         if ($(this).text() == catTxt)
            nbmgs++;
      });
      $(".actdeleteglobcat span").text("Are you sure to delete this category (" + catTxt + ", " + nbmgs + " mangas affected) ?");
      $(".actdeleteglobcat .yes").data("catdel", catTxt);
      $(".actdeleteglobcat .yes").data("catbtn", $(this));
      $(".actdeleteglobcat").toggle("blind", {}, 250);
      event.stopImmediatePropagation();
   });
   $(".actdeleteglobcat .yes").unbind();
   $(".actdeleteglobcat .yes").click(function () {
      var catTxt = $(this).data("catdel");
      var obj = {
         action : "removeCategory",
         cat : catTxt
      };
      var _btn = $($(this).data("catbtn"));
      var _par = $(_btn).parent();
      sendExtRequest(obj, _par, function () {
         $(".mgcategory").each(function (index) {
            if ($(this).text() == catTxt) {
               var _mg = $(this).closest(".manga");
               $(this).remove();
               if ($(".mgcategory", _mg).size() == 0) {
                  $(".mginfos .cats", _mg).text("No category for this manga");
               }
            }
         });
         _par.remove();
         displayMangasByCat();
         saveCategories();
         $(".actdeleteglobcat").toggle("blind", {}, 250);
      });
   });
   $(".actdeleteglobcat .no").unbind();
   $(".actdeleteglobcat .no").click(function () {
      $(".actdeleteglobcat").toggle("blind", {}, 250);
   });
   $(".actcatmgdel").unbind();
   $(".actcatmgdel").click(function (event) {
      var catToDel = $(this).parent().text();
      if (isInGroup($(this))) {
         var obj = {
            action : "removeCatMangas",
            list : []
         };
         if (isList()) {
            $(".mgline", $(this).closest(".manga")).each(function (index) {
               obj.list[obj.list.length] = {
                  cat : catToDel,
                  url : $(this).data("mgurl")
               };
            });
         } else {
            $(".mgelt", $(this).closest(".manga")).each(function (index) {
               obj.list[obj.list.length] = {
                  cat : catToDel,
                  url : $(this).data("mgurl")
               };
            });
         }
         var _par = $(this).parent();
         sendExtRequest(obj, _par, function () {
            var _cats = $(".mginfos .cats", $(_par).closest(".manga"));
            $(_par).remove();
            if ($(".mgcategory", _cats).size() == 0) {
               _cats.text("No category for this manga");
            }
            displayMangasByCat();
         });
      } else {
         var obj = {
            action : "removeCatManga",
            cat : catToDel,
            url : closestEltData($(this)).data("mgurl")
         };
         var _par = $(this).parent();
         sendExtRequest(obj, _par, function () {
            var _cats = $(".mginfos .cats", $(_par).closest(".manga"));
            $(_par).remove();
            if ($(".mgcategory", _cats).size() == 0) {
               _cats.text("No category for this manga");
            }
            displayMangasByCat();
         });
      }
   });
}
function saveCategories() {
   var cats = [];
   $(".category:not(.addcategory):not(.newcat)").each(function (index) {
      var cat = {
         name : $(this).text(),
         state : "",
         type : ""
      };
      if ($(this).hasClass("user")) {
         cat.type = "user";
      } else if ($(this).hasClass("native")) {
         cat.type = "native";
      }
      if ($(this).hasClass("include")) {
         cat.state = "include";
      } else if ($(this).hasClass("exclude")) {
         cat.state = "exclude";
      }
      cats[cats.length] = cat;
   });
   localStorage["categoriesStates"] = JSON.stringify(cats);
}
function bindFoot() {
   $("#time").click(function () {
      $(".bottomdiv").each(function (index) {
         if ($(this).is(":visible") && !$(this).hasClass("timers")) {
            $(this).toggle("blind", {}, 500);
         }
      });
      $(".bottomdiv.timers").toggle("blind", {}, 500);
      var html = "<span>Chapters lists have been updated <b>" + getTimeSince(localStorage["lastChaptersUpdate"]) + "</b></span><div class='button refreshmgchapnow' style='margin-left:5px;'>Refresh</div><br />";
      html += "<span>Manga lists have been updated <b>" + getTimeSince(localStorage["lastMangasUpdate"]) + "</b></span><br />";
      html += "<span>Websites implementations have been updated <b>" + getTimeSince(localStorage["lastWsUpdate"]) + "</b></span><div class='button refreshwsnow' style='margin-left:5px;'>Refresh</div>";
      if (parameters.sync == 1) {
         html += "<br /><span>All Mangas Reader has been sychronized <b>" + getTimeSince(parameters.lastsync) + "</b></span>";
      }
      $(".bottomdiv.timers").html(html);
      $(".refreshmgchapnow").click(function () {
         $(this).remove();
         var html = "<span>Chapters lists have been updated <b>" + getTimeSince(localStorage["lastChaptersUpdate"]) + "</b>. Chapters refresh has been launched, you must reload the popup to see changes.</span><br />";
         html += "<span>Manga lists have been updated <b>" + getTimeSince(localStorage["lastMangasUpdate"]) + "</b></span><br />";
         html += "<span>Websites implementations have been updated <b>" + getTimeSince(localStorage["lastWsUpdate"]) + "</b></span><div class='button refreshwsnow' style='margin-left:5px;'>Refresh</div>";
         if (parameters.sync == 1) {
            html += "<br /><span>All Mangas Reader has been sychronized <b>" + getTimeSince(parameters.lastsync) + "</b></span>";
         }
         $(".bottomdiv.timers").html(html);
         chrome.extension.getBackgroundPage().refreshAllLasts(true, true);
         var html = "<span>Chapters lists have been updated <b>" + getTimeSince(localStorage["lastChaptersUpdate"]) + "</b>. Chapters refresh has been launched, you must reload the popup to see changes.</span><br />";
         html += "<span>Manga lists have been updated <b>" + getTimeSince(localStorage["lastMangasUpdate"]) + "</b></span><br />";
         html += "<span>Websites implementations have been updated <b>" + getTimeSince(localStorage["lastWsUpdate"]) + "</b></span><div class='button refreshwsnow' style='margin-left:5px;'>Refresh</div>";
         if (parameters.sync == 1) {
            html += "<br /><span>All Mangas Reader has been sychronized <b>" + getTimeSince(parameters.lastsync) + "</b></span>";
         }
         $(".bottomdiv.timers").html(html);
      });
      $(".refreshwsnow").click(function () {
         $(this).remove();
         var html = "<span>Chapters lists have been updated <b>" + getTimeSince(localStorage["lastChaptersUpdate"]) + "</b></span><div class='button refreshmgchapnow' style='margin-left:5px;'>Refresh</div><br />";
         html += "<span>Manga lists have been updated <b>" + getTimeSince(localStorage["lastMangasUpdate"]) + "</b></span><br />";
         html += "<span>Websites implementations have been updated <b>" + getTimeSince(localStorage["lastWsUpdate"]) + "</b>. Websites refresh has been launched...</span><br />";
         if (parameters.sync == 1) {
            html += "<br /><span>All Mangas Reader has been sychronized <b>" + getTimeSince(parameters.lastsync) + "</b></span>";
         }
         $(".bottomdiv.timers").html(html);
         chrome.extension.getBackgroundPage().refreshWebsites(true, true);
         var html = "<span>Chapters lists have been updated <b>" + getTimeSince(localStorage["lastChaptersUpdate"]) + "</b></span><div class='button refreshmgchapnow' style='margin-left:5px;'>Refresh</div><br />";
         html += "<span>Manga lists have been updated <b>" + getTimeSince(localStorage["lastMangasUpdate"]) + "</b></span><br />";
         html += "<span>Websites implementations have been updated <b>" + getTimeSince(localStorage["lastWsUpdate"]) + "</b>. Websites refresh has been launched...</span><br />";
         if (parameters.sync == 1) {
            html += "<br /><span>All Mangas Reader has been sychronized <b>" + getTimeSince(parameters.lastsync) + "</b></span>";
         }
         $(".bottomdiv.timers").html(html);
      });
   });
   $("#donate").click(function () {
      $(".bottomdiv").each(function (index) {
         if ($(this).is(":visible") && !$(this).hasClass("donate")) {
            $(this).toggle("blind", {}, 500);
         }
      });
      $(".bottomdiv.donate").toggle("blind", {}, 500);
   });
   $("#paypalus").click(function () {
      openTab("https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=MPJ2DWQP67FHJ");
   });
   $("#paypaleuro").click(function () {
      openTab("https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=PTFDEMDFNKQAG");
   });
   $("#fblike").click(function () {
      openTab("http://www.facebook.com/pages/All-Mangas-Reader/214541438575022");
   });
   $("#gplike").click(function () {
      openTab("https://plus.google.com/112854960469526703676/");
   });
   $("#external").click(function () {
      openTab("/popup.html?mode=normal");
   });
   $("#forum").click(function () {
      openTab("http://www.allmangasreader.com/forum/");
   });
   $("#amrc").click(function () {
      openTab("http://community.allmangasreader.com/");
   });
   $("#impexp").click(function () {
      openTab("importexport.html");
   });
   $("#stats").click(function () {
      openTab("http://www.allmangasreader.com/stats.php?stat=manga");
   });
   $("#pstats").click(function () {
      openTab("pstat.html");
   });
   $("#readallmg").click(function () {
      $(".bottomdiv").each(function (index) {
         if ($(this).is(":visible") && !$(this).hasClass("actreadallmg")) {
            $(this).toggle("blind", {}, 500);
         }
      });
      $(".bottomdiv.actreadallmg").toggle("blind", {}, 500);
      $(".bottomdiv.actreadallmg span").text("Are you sure to mark all currently viewable mangas as read (" + $(".manga.new:visible").size() + " mangas) ?");
   });
   $("#deleteallmg").click(function () {
      $(".bottomdiv").each(function (index) {
         if ($(this).is(":visible") && !$(this).hasClass("actdeleteallmg")) {
            $(this).toggle("blind", {}, 500);
         }
      });
      $(".bottomdiv.actdeleteallmg").toggle("blind", {}, 500);
      $(".bottomdiv.actdeleteallmg span").text("Are you sure to delete all currently viewable mangas from the list (" + $(".manga:visible").size() + " mangas) ?");
   });
   $(".bottomdiv.actreadallmg .no").click(function () {
      $(this).closest(".actreadallmg").toggle("blind", {}, 500);
   });
   $(".bottomdiv.actdeleteallmg .no").click(function () {
      $(this).closest(".actdeleteallmg").toggle("blind", {}, 500);
   });
   $(".bottomdiv.actreadallmg .yes").click(function () {
      var obj = {
         action : "readMangas",
         list : []
      };
      $(".manga.new:visible").each(function (index) {
         if (isList()) {
            if ($(".mgline", $(this)).size() > 0) {
               $(".mgline", $(this)).each(function (index) {
                  obj.list[obj.list.length] = {
                     url : $(this).data("mgurl"),
                     lastChapterReadURL : $(this).data("mglatesturl")
                  };
               });
            } else {
               obj.list[obj.list.length] = {
                  url : $(this).data("mgurl"),
                  lastChapterReadURL : $(this).data("mglatesturl")
               };
            }
         } else {
            if ($(".mgelt", $(this)).size() > 0) {
               $(".mgelt", $(this)).each(function (index) {
                  obj.list[obj.list.length] = {
                     url : $(this).data("mgurl"),
                     lastChapterReadURL : $(this).data("mglatesturl")
                  };
               });
            } else {
               obj.list[obj.list.length] = {
                  url : $(this).data("mgurl"),
                  lastChapterReadURL : $(this).data("mglatesturl")
               };
            }
         }
      });
      var _self = this;
      sendExtRequest(obj, $(this), function () {
         $(".manga.new:visible").each(function (index) {
            $(this).closest(".manga").removeClass("new");
            $(".actread", $(this)).unbind("click");
            $(".actread", $(this)).attr("src", chrome.extension.getURL("img/blank.png"));
            if (isList()) {
               $(".mgline", $(this)).removeClass("new");
            } else {
               $(".mgelt", $(this)).removeClass("new");
            }
            $(".mglist select", $(this)).each(function (index) {
               closestEltData($(this)).data("mgplay", $("option:first", $(this)).val());
               $(this).val($("option:first", $(this)).val());
            });
            moveMangaParent($(".actread", $(this)));
            updateProgression($(".actread", $(this)));
            $(".actreadall", $(this)).remove();
         });
         $(_self).closest(".actreadallmg").toggle("blind", {}, 500);
      }, true);
   });
   $(".bottomdiv.actdeleteallmg .yes").click(function () {
      var obj = {
         action : "killMangas",
         list : []
      };
      $(".manga:visible").each(function (index) {
         if (isList()) {
            if ($(".mgline", $(this)).size() > 0) {
               $(".mgline", $(this)).each(function (index) {
                  obj.list[obj.list.length] = {
                     url : $(this).data("mgurl"),
                     name : $(this).data("mgname")
                  };
               });
            } else {
               obj.list[obj.list.length] = {
                  url : $(this).data("mgurl"),
                  name : $(this).data("mgname")
               };
            }
         } else {
            if ($(".mgelt", $(this)).size() > 0) {
               $(".mgelt", $(".manga:visible")).each(function (index) {
                  obj.list[obj.list.length] = {
                     url : $(this).data("mgurl"),
                     name : $(this).data("mgname")
                  };
               });
            } else {
               obj.list[obj.list.length] = {
                  url : $(this).data("mgurl"),
                  name : $(this).data("mgname")
               };
            }
         }
      });
      var _self = this;
      sendExtRequest(obj, $(this), function () {
         $(".manga:visible").toggle("blind", {}, 500, function () {
            $(this).remove();
            firstLastMg();
         });
         $(_self).closest(".actdeleteallmg").toggle("blind", {}, 500);
      });
   });
   $("#desactivateLink").click(function () {
      openTab("options.html?tab=sites");
   });
}
function getTimeSince(timeDif) {
   var txt = "";
   if (timeDif != undefined) {
      var tmpDif = (new Date().getTime() - timeDif) / 1000;
      if (tmpDif < 60) {
         txt += Math.floor(tmpDif) + " seconds ago";
      } else if (tmpDif / 60 < 60) {
         txt += Math.floor((tmpDif / 60)) + " minutes ago";
      } else if (tmpDif / 3600 < 60) {
         txt += Math.floor((tmpDif / 3600)) + " hours ago";
      } else {
         txt += Math.floor((tmpDif / 3600 / 24)) + " days ago";
      }
   } else {
      txt += "Never";
   }
   return txt;
}

