
var mirrors;
var bmsAll;

$(function() {
  load();
  $("#mangas").change(function() {
    filter();
  });
  $("#searchBoxInput").keypress(function(e) {
    var key=e.keyCode || e.which;
    if (key==13){
      localStorage["bookmarkMangasSearch"] = $("#searchBoxInput").val();
      filter();
    }
  });
  $("#butFind").click(function(e) {
    localStorage["bookmarkMangasSearch"] = $("#searchBoxInput").val();
    filter();
  });
  $("#chapOng").click(function() {
    switchOnglet(this, 'ongC');
  });
  $("#scanOng").click(function() {
    switchOnglet(this, 'ongS');
  });
});

function getMangaMirror(mirror) {
  for (var i = 0; i < mirrors.length; i++) {
    if (mirrors[i].mirrorName == mirror) {
      return mirrors[i];
    }
  }
  return null;
}

function switchOnglet(ong, tab) {
  $(".tab").removeClass("checked");
  $(ong).addClass("checked");
  $(".ongletCont").each(function(index) {
    if ($(this).attr("id") == tab) {
      $(this).show();
    } else {
      $(this).hide();
    }
  });
  localStorage["bookmarkTab"] = tab;
}
function getElementsByClass(searchClass, obj) {
	if (!obj) {
		obj = document;
	}

	var classElements = new Array();
	var els = document.getElementsByTagName('*');
	var elsLen = els.length
	for (i = 0, j = 0; i < elsLen; i++)
	{
		var classes = els[i].className.split(' ');
		for (k = 0; k < classes.length; k++)
			if ( classes[k] == searchClass )
				classElements[j++] = els[i];
	}
	return classElements;
}

function isMirrorEnable(mirrorName) {
  if (localStorage["bookmarkMirrorsState"] != undefined) {
    var obj = JSON.parse(localStorage["bookmarkMirrorsState"]);
    for (var i = 0; i < obj.length; i++) {
      if (obj[i].mirror == mirrorName) {
        return obj[i].state;
      }
    }
  }
  return true;
}

function setMirrorState(mirrorName, state) {
  if (localStorage["bookmarkMirrorsState"] != undefined) {
    var obj = JSON.parse(localStorage["bookmarkMirrorsState"]);
    var isFound = false;
    for (var i = 0; i < obj.length; i++) {
      if (obj[i].mirror == mirrorName) {
        obj[i] = {'mirror': mirrorName, 'state': state};
        localStorage["bookmarkMirrorsState"] = JSON.stringify(obj);
        isFound = true;
        break;
      }
    }
    if (!isFound) {
      obj[obj.length] = {'mirror': mirrorName, 'state': state};
      localStorage["bookmarkMirrorsState"] = JSON.stringify(obj);
    }
  } else {
    localStorage["bookmarkMirrorsState"] = JSON.stringify([{'mirror': mirrorName, 'state': state}]);
  }
}

function load() {
  loadMenu("bookmarks");
  $(".showInit").show();
  if (localStorage["bookmarkTab"] != undefined) {
    if (localStorage["bookmarkTab"] == "ongC") {
      switchOnglet($("#chapOng")[0], 'ongC');
    } else {
      switchOnglet($("#scanOng")[0], 'ongS');
    }
  }

  wssql.init();
  mirrors = chrome.extension.getBackgroundPage().actMirrors;
  //mirrors = mirrorsT;
  for (var i = 0; i < mirrors.length; i++) {
    var imga = $("<a href='#'><img src='"+ mirrors[i].mirrorIcon + "' title='" + mirrors[i].mirrorName + "'/></a>");
    imga.click(function() {
      $(this).parent().toggleClass("checked");
      if ($(this).parent().hasClass("checked")) {
        setMirrorState($("img", $(this)).attr("title"), true);
      } else {
        setMirrorState($("img", $(this)).attr("title"), false);
      }
      filter();
      return false;
    });
    var div;
    if (!isMirrorEnable(mirrors[i].mirrorName)) {
      div = $("<div class='mirrorIcon'></div>");
    } else {
      div = $("<div class='mirrorIcon checked'></div>");
    }
    imga.appendTo(div);
    div.appendTo($("#mirrorsCheck"));
  }

  var valSlide = localStorage["bookmarkSlideValue"];
  if (valSlide === undefined || valSlide === 0 || valSlide === "0") {
    valSlide = 298;
  }

  $("#slider").slider({min: 80, max: 750, value: valSlide, change: function(event, ui) {
    slideChange();
  }});

  $("#mangas").change(function() {
    localStorage["bookmarkMangasSelect"] = $("#mangas option:selected").val();
  });

  createPopupBM();
  loadBookmarks();
}
function slideChange() {
  $(".scanDiv").css("max-width", $("#slider").slider("option", "value") + "px");
  $(".scanChap").css("max-width", $("#slider").slider("option", "value") + "px");
  $(".scanImg").css("width", $("#slider").slider("option", "value") + "px");
  $(".scanImg").css("height", $("#slider").slider("option", "value") + "px");
  $(".scanImg img").css("max-width", $("#slider").slider("option", "value") + "px");
  $(".scanImg img").css("max-height", $("#slider").slider("option", "value") + "px");
  localStorage["bookmarkSlideValue"] = $("#slider").slider("option", "value");
}
function filter() {
  var tmpLst = [];
  for (var i = 0; i < bmsAll.length; i++) {
    var isOk = true;
    if ($("#mangas option:selected").val() != "") {
      if (!isSame($("#mangas option:selected").val(), bmsAll[i].name)) {
        isOk = false;
      }
    }
    if ($("#searchBoxInput").val() != "") {
      var found = false;
      var valS = $("#searchBoxInput").val().trim();
      if (bmsAll[i].name.indexOf(valS) != -1) {found = true;}
      if (bmsAll[i].chapName.indexOf(valS) != -1) {found = true;}
      if (bmsAll[i].note.indexOf(valS) != -1) {found = true;}
      if (!found) {
        isOk = false;
      }
    }
    if (!$("#mirrorsCheck img[title='" + bmsAll[i].mirror + "']").parent().parent().hasClass("checked")) {
      isOk = false;
    }
    if (isOk) {
      tmpLst[tmpLst.length] = bmsAll[i];
    }
  }
  if (tmpLst.length > 0) {
    $("#results").css("display", "block");
    $("#nores").css("display", "none");
    renderManga(tmpLst);
    slideChange();
  } else {
    $("#results").css("display", "none");
    $("#nores").css("display", "block");
  }
}

function loadBookmarks() {
  if (localStorage["bookmarkMangasSearch"] != undefined) {
    $("#searchBoxInput").val(localStorage["bookmarkMangasSearch"]);
  }
  var bms = localStorage["bookmarks"];
  var lstTmp = JSON.parse(bms);//$A(eval('(' + bms + ')'));
  bmsAll = removeUnknown(lstTmp);

  if (bmsAll.length > 0) {
    sortBms(bmsAll);
    var valMg = null;
    /*if ($("#mangas option").size() > 0) {
      valMg = $("#mangas option:selected").val();
    } else {*/
      valMg = localStorage["bookmarkMangasSelect"];
    //}
    $("#mangas").empty();
    $("<option value='' " + ((valMg == "") ? "selected='selected'" : "") + ">All mangas</option>").appendTo($("#mangas"));
    var curMg;
    for (var i = 0; i < bmsAll.length; i++) {
      if (curMg != undefined && !isSame(curMg, bmsAll[i].name)) {
        var opt = $("<option value='" + curMg + "'>" + curMg + "</option>");
        if (valMg != null && valMg != "" && isSame(valMg, curMg)) {
          opt.attr("selected", true);
        }
        opt.appendTo($("#mangas"));
      }
      curMg = bmsAll[i].name;
    }
    if (curMg != undefined) {
      var opt = $("<option value='" + curMg + "'>" + curMg + "</option>");
      if (valMg != null && valMg != "" && isSame(valMg, curMg)) {
        opt.attr("selected", true);
      }
      opt.appendTo($("#mangas"));
    }
    filter();
  } else {
    $("#mangas").empty();
    $("<option value=''>No bookmarks found</option>").appendTo($("#mangas"));
    $("#mangas").attr("disabled", "true");
    $("#results").css("display", "none");
    $("#nores").css("display", "block");
  }
}

function removeUnknown(lst) {
  var lstRes = [];
  for (var i = 0; i < lst.length; i++) {
    if (getMangaMirror(lst[i].mirror) != null) {
      lstRes[lstRes.length] = lst[i];
    }
  }
  return lstRes;
}

function renderManga(lstBms) {
  var divChaps;
  var divScans;
  var parity = 0;
  for (var i = 0; i < lstBms.length; i++) {
    if (lstBms[i].type == "chapter") {
      if (divChaps == undefined) {
        $("#noreschap").css("display", "none");
        divChaps = $("<div class='mangaChapsDiv'></div>");
        $("#resultschap").empty();
        divChaps.appendTo($("#resultschap"));
        $("<table></table>").appendTo(divChaps);
      }
      var tr = $("<tr class='chapLine'></tr>");

      tr.data("mirror", lstBms[i].mirror);
      tr.data("url", lstBms[i].url);
      tr.data("chapUrl", lstBms[i].chapUrl);
      tr.data("type", lstBms[i].type);
      tr.data("name", lstBms[i].name);
      tr.data("chapName", lstBms[i].chapName);
      tr.data("note", lstBms[i].note);

      if (parity % 2 == 0) {
        tr.addClass("even");
      } else {
        tr.addClass("odd");
      }
      tr.appendTo($("table", divChaps));
      var tdChap = $("<td class='chapName'><img src='"+ getMangaMirror(lstBms[i].mirror).mirrorIcon + "' title='" + getMangaMirror(lstBms[i].mirror).mirrorName + "'/><a href='#' onclick=\"chrome.extension.sendRequest({action: 'opentab', url: '" + lstBms[i].chapUrl + "'}, function(){});\">" + lstBms[i].chapName + "</a>" + (($("#mangas option:selected").val() == "") ? "&nbsp;(" + lstBms[i].name + ")" : "") + "</td>");
      tdChap.appendTo(tr);
      var tdNote = $("<td class='chapNote'>" + lstBms[i].note + "</td>");
      tdNote.appendTo(tr);

      var divIconsCont = $("<div class='scanIconsContTd'></div>");
      var divIcons = $("<div class='scanIcons'></div>");
      divIcons.appendTo(divIconsCont);
      divIconsCont.appendTo(tdNote);

      var imgModify = $("<div class='scanMirror'></div>");
      var aMod = $("<a href='#'><img src='img/edit.png' title='Modify'/></a>");
      aMod.click(function() {
        modifyBM($(this).parent().parent().parent().parent().parent());
        return false;
      });
      aMod.appendTo(imgModify);
      imgModify.appendTo(divIcons);

      var imgDelete = $("<div class='scanMirror'></div>");
      var aDel = $("<a href='#'><img src='img/cancel.png' title='Delete Bookmark'/></a>");
      aDel.click(function() {
        deleteBM($(this).parent().parent().parent().parent().parent());
        return false;
      });
      aDel.appendTo(imgDelete);
      imgDelete.appendTo(divIcons);

      parity++;
    } else {
      if (divScans == undefined) {
        $("#noresscans").css("display", "none");
        divScans = $("<div class='mangaScansDiv'></div>");
        $("#resultsscans").empty();
        divScans.appendTo($("#resultsscans"));
      }
      createScan(lstBms[i], divScans);
    }
  }
  $("#resultschap .mangaChapsDiv .chapLine:first").addClass("firstLine");
  $("#resultschap .mangaChapsDiv .chapLine:last").addClass("lastLine");

  if (divChaps == undefined) {
    $("#resultschap").empty();
    $("#noreschap").css("display", "block");
  }
  if (divScans == undefined) {
    $("#resultsscans").empty();
    $("#noresscans").css("display", "block");
  }
  $("a[rel^='prettyPhoto']").prettyPhoto({animation_speed: 'fast', theme: 'light_rounded', overlay_gallery: false, keyboard_shortcuts: true});
}

function createScan(obj, where) {
  var divImg = $("<div class='scanDiv'></div>");
  divImg.data("mirror", obj.mirror);
  divImg.data("url", obj.url);
  divImg.data("chapUrl", obj.chapUrl);
  divImg.data("type", obj.type);
  divImg.data("name", obj.name);
  divImg.data("chapName", obj.chapName);
  divImg.data("scanUrl", obj.scanUrl);
  divImg.data("scanName", obj.scanName);
  divImg.data("note", obj.note);

  var divIconsCont = $("<div class='scanIconsCont'></div>");
  var divIcons = $("<div class='scanIcons'></div>");
  divIcons.appendTo(divIconsCont);
  divIconsCont.appendTo(divImg);
  var imgMirror = $("<div class='scanMirror'><img src='"+ getMangaMirror(obj.mirror).mirrorIcon + "' title='" + getMangaMirror(obj.mirror).mirrorName + "'/></div>");
  imgMirror.appendTo(divIcons);

  var imgModify = $("<div class='scanMirror'></div>");
  var aMod = $("<a href='#'><img src='img/edit.png' title='Modify'/></a>");
  aMod.click(function() {
    modifyBM($(this).parent().parent().parent().parent());
    return false;
  });
  aMod.appendTo(imgModify);
  imgModify.appendTo(divIcons);

  var imgDelete = $("<div class='scanMirror'></div>");
  var aDel = $("<a href='#'><img src='img/cancel.png' title='Delete Bookmark'/></a>");
  aDel.click(function() {
    deleteBM($(this).parent().parent().parent().parent());
    return false;
  });
  aDel.appendTo(imgDelete);
  imgDelete.appendTo(divIcons);

  var divImgImg = $("<div class='scanImg'></div>");
  var img = $("<a href='" + obj.scanUrl + "' rel='prettyPhoto[gal]' title='" + obj.note + "'></a>");
  var imgimg = $("<img src='" + obj.scanUrl + "' alt='" + obj.chapName + "' />");
  imgimg.appendTo(img);
  imgimg.load(function() {
    if (this.width < this.height) {
      $(".scanMirror", $(this).parent().parent().parent()).addClass("horiz");
    }
  });
  img.appendTo(divImgImg);
  divImgImg.appendTo(divImg);
  var chap = $("<div class='scanChap'><a href='#' onclick=\"chrome.extension.sendRequest({action: 'opentab', url: '" + obj.chapUrl + "'}, function(){});\"><span>" + obj.chapName + "</span></a>" + (($("#mangas option:selected").val() == "") ? "&nbsp;(" + obj.name + ")" : "") + "</div>");
  chap.appendTo(divImg);
  var note = $("<div class='scanNote'><span>" + obj.note + "</span></div>");
  note.appendTo(divImg);
  divImg.appendTo(where);
  divImg.hover(function(){
    $(".scanIconsCont", $(this)).fadeIn(200);
  }, function(){
    $(".scanIconsCont", $(this)).fadeOut(200);
  });
}

function createPopupBM() {
  var divData = $("<div id='bookmarkData' style='display:none'></div>");
  $("<span>This div is used to store data for AMR</span>").appendTo(divData);
  divData.appendTo($(document.body));

  var div = $("<div id='bookmarkPop' style='display:none'></div>");
  $("<h3>Bookmark</h3>").appendTo(div);
  $("<div id='descEltAMR'></div>").appendTo(div);
  $("<table><tr><td style='vertical-align:top'><b>Note:</b></td><td><textarea id='noteAMR' cols='50' rows='5' /></td></tr></table>").appendTo(div);
  var btn = $("<a id='saveBtnAMR' class='buttonAMR'>Save</a>")
  btn.click(function() {
    var obj = {
      action: "addUpdateBookmark",
      mirror: $("#bookmarkData").data("mirror"),
      url: $("#bookmarkData").data("url"),
      chapUrl: $("#bookmarkData").data("chapUrl"),
      type: $("#bookmarkData").data("type"),
      name: $("#bookmarkData").data("name"),
      chapName: $("#bookmarkData").data("chapName")
    };
    if ($("#bookmarkData").data("type") != "chapter") {
      obj.scanUrl = $("#bookmarkData").data("scanUrl");
      obj.scanName = $("#bookmarkData").data("scanName");
    }
    obj.note = $("#noteAMR").val();

    chrome.extension.sendRequest(obj, function(resp) {
      loadBookmarks();
    });
    $.modal.close();
    return false;
  });
  btn.appendTo(div);
  div.appendTo($(document.body));
}


function modifyBM(dataElt) {
  $("#bookmarkData").data("mirror", dataElt.data("mirror"));
  $("#bookmarkData").data("url", dataElt.data("url"));
  $("#bookmarkData").data("chapUrl", dataElt.data("chapUrl"));
  $("#bookmarkData").data("type", dataElt.data("type"));
  $("#bookmarkData").data("name", dataElt.data("name"));
  $("#bookmarkData").data("chapName", dataElt.data("chapName"));
  $("#bookmarkData").data("scanUrl", dataElt.data("scanUrl"));
  $("#bookmarkData").data("scanName", dataElt.data("scanName"));
  $("#bookmarkData").data("note", dataElt.data("note"));
  $("#noteAMR").val($("#bookmarkData").data("note"));

  var textDesc;
  if ($("#bookmarkData").data("type") == "chapter") {
    textDesc = "Bookmark chapter '" + $("#bookmarkData").data("chapName") + "' of '" + $("#bookmarkData").data("name") + "' on '" + $("#bookmarkData").data("mirror");
    textDesc += "'. You can add notes below which will be associated with this bookmark.";
  } else {
    textDesc = "Bookmark scan '" + $("#bookmarkData").data("scanName") + "' of chapter '" + $("#bookmarkData").data("chapName") + "' of '" + $("#bookmarkData").data("name") + "' on '" + $("#bookmarkData").data("mirror");
    textDesc += "'. You can add notes below which will be associated with this bookmark.";
  }
  $("#bookmarkPop #descEltAMR").text(textDesc);

  $("#bookmarkPop").modal({focus:false});
}

function deleteBM(dataElt) {
  var textDesc;
  if (dataElt.data("type") == "chapter") {
    textDesc = "Are you sure to delete the bookmarked chapter '" + $("#bookmarkData").data("chapName") + "' of '" + $("#bookmarkData").data("name") + "' on '" + $("#bookmarkData").data("mirror");
    textDesc += "' ?";
  } else {
    textDesc = "Are you sure to delete the bookmarked scan '" + $("#bookmarkData").data("scanName") + "' of chapter '" + $("#bookmarkData").data("chapName") + "' of '" + $("#bookmarkData").data("name") + "' on '" + $("#bookmarkData").data("mirror");
    textDesc += "' ?";
  }
  var res = confirm(textDesc);

  if (res) {
    var obj = {
      action: "deleteBookmark",
      mirror: dataElt.data("mirror"),
      url: dataElt.data("url"),
      chapUrl: dataElt.data("chapUrl"),
      type: dataElt.data("type"),
    };
    if (dataElt.data("type") != "chapter") {
      obj.scanUrl = dataElt.data("scanUrl");
      obj.scanName = dataElt.data("scanName");
    }
    chrome.extension.sendRequest(obj, function(resp) {
      loadBookmarks();
    });
  }
}

function sortBms(bms) {
  bms.sort(function(a, b) {
    if (isSame(a.name, b.name)) {
      if (a.chapterUrl == b.chapterUrl) {
        if (a.type == b.type) {
          if (a.type == "chapter") {
            return 0;
          } else {
            return compareTo(a.scanName, b.scanName);
          }
        } else {
          if (a.type == "chapter") {
            return -1;
          } else {
            return 1;
          }
        }
      } else {
        return compareTo(a.chapterUrl, b.chapterUrl);
      }
    } else {
      return compareTo(a.name, b.name);
    }
  });
}

function compareTo(a, b) {
  if (a < b) {
    return -1;
  } else if (a == b) {
    return 0;
  } else {
    return 1;
  }
}

function isSame(a, b) {
  var at = a.trim().replace(/^\s*|\s*$/g,'').toUpperCase();
  var bt = b.trim().replace(/^\s*|\s*$/g,'').toUpperCase();
  return (at == bt);
}
