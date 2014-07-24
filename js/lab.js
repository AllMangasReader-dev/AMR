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

var mirrors,
    params = chrome.extension.getBackgroundPage().getParameters();
amrcsql.init();

$(function() {
  load();

  $("#mirrorList").change(function() {
    changeMirror();
  });

  $(".loadtest").click(function() {
    loadTestForMirror();
  });
  $(".reload").click(function() {
    reload();
  });

  $("#searchBoxInput").keypress(function(event) {
    if(event.keyCode==13)
      loadTestForMirror();
  });

  $("#testnotif").click(testnotif);
  $("#testwsnot").click(testwsnot);
  $("#testwsnot2").click(testwsnot2);
  $("#testwsnot3").click(testwsnot3);

});

function testnotif() {
  var mangaData = {name: "Test Manga", mirror: "TestMirror", url: "http://test.allmangasreader.com/"};
  var title = "... has new chapter(s) on " + mangaData.mirror + "! Click anywhere to open the next unread chapter.";
  var notif = window.webkitNotifications.createNotification(
        chrome.extension.getURL('img/icon-32.png'), mangaData.name, title);
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
  if(params.notificationtimer > 0) {
    setTimeout(function() {
      notif.cancel();
    }, 1000 * params.notificationtimer);
  }
}
function testwsnot() {
  var wsData = {ws: "TestMirror", developer: "testdev", revision: 0, idext: 1, isnew: false};
  displayNotification(wsData);
}
function testwsnot2() {
  var wsData = {ws: "TestMirror", developer: "testdev", revision: 2, idext: 1, isnew: false};
  displayNotification(wsData);
}
function testwsnot3() {
  var wsData = {ws: "TestMirror", developer: "testdev", revision: 2, idext: 1, isnew: true};
  displayNotification(wsData);
}

function displayNotification(wsData) {
  //var wsData = {ws: description.mirrorName, developer: description.developer, revision: description.revision, idext: description.id, isnew: isNew};
  var text = "";
  if (wsData.revision > 0) {
    if (wsData.isnew) {
      text = "Implementation created by " + wsData.developer + ".";
    } else {
      text = "Implementation updated by " + wsData.developer + " (revision " + wsData.revision + ").\nThis may have fixed issues on this website !";
    }
  } else {
    text = "Implementation updated for a temporary version. (developer : " + wsData.developer + ").\nIf you want to come back to normal revision, go to option page, 'Supported websites' tab.";
  }
  text += "\nYou can discuss this implementation by clicking on the notification (login required)";
  var notif = window.webkitNotifications.createNotification(
        chrome.extension.getURL('img/icon-32.png'), wsData.ws, text);
  notif.url = "http://community.allmangasreader.com/comments.php?type=1&id=" + wsData.idext;
  notif.onclick = function() {
    var _url = this.url;
    // notif.cancel() should hide the notif once clicked
    notif.cancel();
    chrome.tabs.create({
      "url" : _url
    });
  };
  notif.show();
  if(params.notificationtimer > 0) {
    setTimeout(function() {
      notif.cancel();
    }, 1000 * params.notificationtimer);
  }
}

function getElementsByClass(searchClass, obj) {
	if (!obj) {
		obj = document;
	}

	var classElements = [];
	var els = document.getElementsByTagName('*');
	var elsLen = els.length;
	for (i = 0, j = 0; i < elsLen; i++)
	{
		var classes = els[i].className.split(' ');
		for (k = 0; k < classes.length; k++)
			if ( classes[k] == searchClass )
				classElements[j++] = els[i];
	}
	return classElements;
}

function reload() {
  getMirrors(function(mirrorsT) {
    mirrors = mirrorsT;
  });
}
function load() {
  loadMenu("lab");
  $(".article:not(#resTr):not(.globerrors)").show();
  getMirrors(function(mirrorsT) {
    mirrors = [];
    for (var i = 0; i < mirrorsT.length; i++) {
      if (mirrorsT[i].mirrorName !== undefined) {
        mirrors[mirrors.length] = mirrorsT[i];
      } else {
        $("<li>" + mirrorsT[i].error + "</li>").appendTo($(".globerrors ul"));
        $(".globerrors").show();
      }
    }

    //var icons = [];
    mirrors.sort(function(a, b) {
      return (a.mirrorName.toUpperCase() < b.mirrorName.toUpperCase()) ? - 1 : ((a.mirrorName.toUpperCase() == b.mirrorName.toUpperCase()) ? 0 : 1);
    });
    var curmir = "";
    if (decodeURI(window.location.href).indexOf("mirror=") > 0) {
      curmir = decodeURI(window.location.href).substr(window.location.href.indexOf("mirror=") + 7);
    }
    for (i = 0; i < mirrors.length; i++) {
      if ( mirrors[i].mirrorName == curmir) {
        $("<option value=\"" + mirrors[i].mirrorName + "\" selected=\"selected\">" + mirrors[i].mirrorName + "</option>").appendTo($("#mirrorList"));
      } else {
        $("<option value=\"" + mirrors[i].mirrorName + "\">" + mirrors[i].mirrorName + "</option>").appendTo($("#mirrorList"));
      }
      //icons[icons.length] = {mirror: mirrors[i].mirrorName, icon:  mirrors[i].mirrorIcon};
    }
    //console.log(JSON.stringify(icons));
    changeMirror();
    if (curmir !== "") {
      loadTestForMirror();
    }
  });
}

function changeMirror() {
  if (getMangaMirror($("#mirrorList").val()) !== null)  {
    $("#searchBox").css("display",  ($("#mirrorList").val()).canListFullMangas ? "none" : "table-row");
  }
}

function loadTestForMirror() {
  $("#resTr").css("display", "table-row");
  $("#resZone").empty();

  testAttributes();
  testListMgs();
}

function testAttributes() {
  addResult("attributes", "L", "Test mirror name and icon.", $("<span>Loading...</span>"), "");
  var mirrorName=getMangaMirror($("#mirrorList").val()).mirrorName;
  var icon = new Image();
  $(icon).attr("src", getMangaMirror($("#mirrorList").val()).mirrorIcon);
  $(icon).load(function () {
    modifyStatut("attributes", "O");
    modifyResult("attributes", $("<span>Mirror name is : " + mirrorName + "</span><br /><span>The icon for this mirror is : </span><img src=\"" + getMangaMirror($("#mirrorList").val()).mirrorIcon + "\"/>"));
    modifyComment("attributes", "Mirror name and icon succesfully loaded");
  });
  $(icon).error(function () {
    modifyStatut("attributes", "K");
    modifyResult("attributes", $("<span>Mirror name is : " + mirrorName + "</span><br /><span>The icon can not be loaded</span>"));
    modifyComment("attributes", "Error while loading icon");
  });
}
function testListMgs() {
  addResult("listmgs", "L", "Test if list of mangas can be loaded for this mirror.", $("<span>Loading...</span>"), "");
  getMangaMirror($("#mirrorList").val()).getMangaList($("#searchBoxInput").val(), function(mirName, lst) {
    var res = $("<div></div>");
    var isOk = true;
    if (mirName == $("#mirrorList").val()) {
      $("<span>Mirror name returned by callback is OK</span>").appendTo(res);
    } else {
      $("<span>Mirror name returned by callback is wrong : Mirror name returned is : " + mirName + " and must be " + $("#mirrorList").val() + "</span>").appendTo(res);
      isOk = false;
    }
    $("<br />").appendTo(res);
    if (lst.length === 0) {
      $("<span>ERROR : List of manga is empty (check your code and your connection)</span>").appendTo(res);
      modifyComment("listmgs", "Error while loading list of mangas");
    } else {
      $("<span>List of manga successfully loaded (" + lst.length + " mangas loaded)</span>").appendTo(res);
      var sel = $("<select id=\"lstMangas\"></select>");
      var selUrls = $("<select></select>");
      for (var i = 0; i < lst.length; i++) {
        $("<option value=\"" + lst[i][1] + "\">" + lst[i][0] + "</option>").appendTo(sel);
        $("<option value=\"" + lst[i][1] + "\">" + lst[i][1] + "</option>").appendTo(selUrls);
      }
      $("<br />").appendTo(res);

      sel.css("max-width", "300px");
      sel.appendTo(res);
      var al = $("<input type='button' value='Go'/>");
      al.click(function() {
        window.open($(this).prev().val());
      });
      al.appendTo(res);
      var als = $("<input type='button' value='Source'/>");
      als.click(function() {
        window.open("view-source:" + $(this).prev().prev().val());
      });
      als.appendTo(res);
      $("<br />").appendTo(res);

      selUrls.css("max-width", "300px");
      selUrls.appendTo(res);
      var alu = $("<input type='button' value='Go'/>");
      alu.click(function() {
        window.open($(this).prev().val());
      });
      alu.appendTo(res);
      var alsu = $("<input type='button' value='Source'/>");
      alsu.click(function() {
        window.open("view-source:" + $(this).prev().prev().val());
      });
      alsu.appendTo(res);
      $("<br />").appendTo(res);
      //Add a button
      $("<span>Select a manga in the first list and click on the test button to load tests for this manga :</span>").appendTo(res);
      var but = $("<input type=\"button\" value=\"Test\"/>");
      but.appendTo(res);
      but.click(testChapters);
      modifyComment("listmgs", "List of mangas loaded. Check that the mangas corresponds to those on the web sites. Check the URLs too...");
    }
    modifyResult("listmgs", res);

    if (isOk) {
      modifyStatut("listmgs", "O");
      if ($("#auto").is(':checked')) {
        var index = Math.floor(Math.random()*$("option", $("#lstMangas")).size());
        $("option:nth-child(" + index + ")", $("#lstMangas")).attr("selected", "selected");
        testChapters();
      }
    } else {
      modifyStatut("listmgs", "K");
    }
  });
}

function testChapters() {
  resetAfter("listmgs");
  addResult("listchaps", "L", "Test if list of chapters can be loaded for the selected manga.", $("<span>Loading...</span>"), "");

  getMangaMirror($("#mirrorList").val()).getListChaps($("#lstMangas").val(), $("#lstMangas option:selected").text(), null, function(lst, obj) {
    var res = $("<div></div>");
    var isOk = true;
    if (lst.length === 0) {
      $("<span>ERROR : List of chapters is empty (check your code and your connection). Verify that this manga </span><a href=\"" + $("#lstMangas").val() + "\">" + $("#lstMangas").val() + "</a><span>) contains chapter on the manga site.</span>").appendTo(res);
      modifyComment("listchaps", "Error while loading list of chapters");
      isOk = false;
    } else {
      $("<span>List of chapters successfully loaded (" + lst.length + " chapters loaded)</span>").appendTo(res);
      var sel = $("<select id=\"lstChaps\"></select>");
      var selUrls = $("<select></select>");
      for (var i = 0; i < lst.length; i++) {
        $("<option value=\"" + lst[i][1] + "\">" + lst[i][0] + "</option>").appendTo(sel);
        $("<option value=\"" + lst[i][1] + "\">" + lst[i][1] + "</option>").appendTo(selUrls);
      }
      $("<br />").appendTo(res);
      sel.css("max-width", "300px");
      sel.appendTo(res);
      var al = $("<input type='button' value='Go'/>");
      al.click(function() {
        window.open($(this).prev().val());
      });
      al.appendTo(res);
      var als = $("<input type='button' value='Source'/>");
      als.click(function() {
        window.open("view-source:" + $(this).prev().prev().val());
      });
      als.appendTo(res);
      $("<br />").appendTo(res);
      selUrls.css("max-width", "300px");
      selUrls.appendTo(res);
      var alu = $("<input type='button' value='Go'/>");
      alu.click(function() {
        window.open($(this).prev().val());
      });
      alu.appendTo(res);
      var alsu = $("<input type='button' value='Source'/>");
      alsu.click(function() {
        window.open("view-source:" + $(this).prev().prev().val());
      });
      alsu.appendTo(res);
      $("<br />").appendTo(res);
      //Add a button
      $("<span>Select a chapter in the first list and click on the test button to load tests for this chapter :</span>").appendTo(res);
      var but = $("<input type=\"button\" value=\"Test\"/>");
      but.appendTo(res);
      but.click(testMirrorForChap);
      modifyComment("listchaps", "List of chapters loaded. Check that the chapters corresponds to those on the web sites. Check the URLs too... <b>Verify that the list of chapter is in descending order. The latest Chapter must be the first on the list </b>");
    }
    modifyResult("listchaps", res);

    if (isOk) {
      modifyStatut("listchaps", "O");
      if ($("#auto").is(':checked')) {
        var index = Math.floor(Math.random()*$("option", $("#lstChaps")).size());
        $("option:nth-child(" + index + ")", $("#lstChaps")).attr("selected", "selected");
        testMirrorForChap();
      }
    } else {
      modifyStatut("listchaps", "K");
    }
  });
}

function testMirrorForChap() {
  resetAfter("listchaps");
  addResult("testmirrorchap", "L", "Test if the selected chapter will be selected by the mirror.", $("<span>Loading...</span>"), "");
  var res = getMangaMirror($("#mirrorList").val()).isMe($("#lstChaps").val());
  if (res) {
    modifyResult("testmirrorchap", $("<span>Your mirror will find this chapter as to be treated by him</span>"));
    modifyComment("testmirrorchap", "OK");
    modifyStatut("testmirrorchap", "O");
  } else {
    modifyResult("testmirrorchap", $("<span>Your mirror does not consider the url " + $("#mirrorList").val() + " as to be treated by him</span>"));
    modifyComment("testmirrorchap", "KO");
    modifyStatut("testmirrorchap", "K");
  }
  testMirrorForOtherChap();
}
function testMirrorForOtherChap() {
  addResult("testmirrorotchap", "L", "Test if the selected chapter will be selected by another mirror than the selected one.", $("<span>Loading...</span>"), "");
  var falseMirrors = "";
  var nbFalse = 0;
  for (var i = 0; i < mirrors.length; i++) {
    if (mirrors[i].mirrorName != $("#mirrorList").val()) {
      var res = getMangaMirror(mirrors[i].mirrorName).isMe($("#lstChaps").val());
      if (res) {
        falseMirrors += mirrors[i].mirrorName + ", ";
        nbFalse++;
      }
    }
  }

  if (nbFalse === 0) {
    modifyResult("testmirrorotchap", $("<span>Other mirrors won't find this chapter as to be treated by them</span>"));
    modifyComment("testmirrorotchap", "OK");
    modifyStatut("testmirrorotchap", "O");
  } else {
    modifyResult("testmirrorotchap", $("<span>There is " + nbFalse + " mirrors that will recognize this chapter as to be treated by them. Those mirrors are : " + falseMirrors.substr(0, falseMirrors.length - 2) + "</span>"));
    modifyComment("testmirrorotchap", "KO");
    modifyStatut("testmirrorotchap", "K");
  }
  loadBackAndGoNextTests();
}

function loadBackAndGoNextTests() {
  addResult("loadifr", "L", "Load the chapter in background.", $("<span>Loading...</span>"), "");
  $("#mangaChap").remove();

  $.ajax({
    url: $("#lstChaps").val(),

    success: function(data) {
      var div = document.createElement( "iframe" );
      div.style.display = "none";
      $(div).attr("id", "mangaChap");
      document.body.appendChild(div);
      document.getElementById("mangaChap").contentWindow.document.documentElement.innerHTML = data;
      $(document.getElementById("mangaChap").contentWindow.document).ready(function() {
        modifyResult("loadifr", $("<span>The chapter has been succesfully loaded</span>"));
        modifyComment("loadifr", "OK");
        modifyStatut("loadifr", "O");
        testChapter(document.getElementById("mangaChap").contentWindow.document.documentElement);
      });
    },
    error: function() {
      modifyResult("loadifr", $("<span>Internal error while loading the chapter in background. Check if the URL </span><a href=\"" + $("#lstChaps").val() + "\">"+$("#lstChaps").val()+"</a><span>can be loaded</span>"));
      modifyComment("loadifr", "KO");
      modifyStatut("loadifr", "K");
    }
  });
}


function testChapter(div) {
  var res = testChapIsCurrent($(div));
  if (res) {
    testInfos($(div), function(res) {
      if (res) {
        testImages($(div));
        testNav($(div));
        testHand();
      }
    });
  }
}

function testChapIsCurrent(div) {
  addResult("testchapcur", "L", "Test if the loaded page is a chapter page (containing scans).", $("<span>Loading...</span>"), "");
  var res = getMangaMirror($("#mirrorList").val()).isCurrentPageAChapterPage(div, $("#lstChaps").val());
  if (res) {
    modifyResult("testchapcur", $("<span>The current chapter page will be considered as containing scans</span>"));
    modifyComment("testchapcur", "OK");
    modifyStatut("testchapcur", "O");
  } else {
    modifyResult("testchapcur", $("<span>The current chapter page is not recognized by your mirror as containing scans</span>"));
    modifyComment("testchapcur", "KO");
    modifyStatut("testchapcur", "K");
  }
  return res;
}

function testInfos(div, callback) {
  addResult("testinfos", "L", "Test if the manga informations can be retrieved from loaded page.", $("<span>Loading...</span>"), "");
  getMangaMirror($("#mirrorList").val()).getInformationsFromCurrentPage($(div), $("#lstChaps").val(), function(res) {
    var result = $("<div></div>");
    var isOk = true;
    var isWarn = false;
    $("<span>Informations retrieved from mirror : </span><br/><span>" + JSON.stringify(res) + "</span><br/>").appendTo(result);

    if (res.name === undefined || res.name === null) {
      $("<br/><span>Manga name is not returned by your mirror !</span>").appendTo(result);
      isOk = false;
    } else {
      if (res.name.trim() == $("option:selected", $("#lstMangas")).text().trim()) {
        $("<br/><span>Manga name retrieved match selected manga name</span>").appendTo(result);
      } else {
        $("<br/><span>Manga name retrieved does not match selected manga name (Required : " + $("option:selected", $("#lstMangas")).text().trim() + " ; found : " + res.name.trim() + ")</span>").appendTo(result);
        isWarn = true;
      }
    }
    if (res.currentMangaURL === undefined || res.currentMangaURL === null) {
      $("<br/><span>Manga url is not returned by your mirror !</span>").appendTo(result);
      isOk = false;
    } else {
      if (res.currentMangaURL.trim() == $("#lstMangas").val().trim()) {
        $("<br/><span>Manga url retrieved match selected manga url</span>").appendTo(result);
      } else {
        $("<br/><span>Manga url retrieved does not match selected manga url (Required : " + $("#lstMangas").val().trim() + " ; found : " + res.currentMangaURL.trim() + ")</span>").appendTo(result);
        isOk = false;
      }
    }
    if (res.currentChapter === undefined || res.currentChapter === null) {
      $("<br/><span>Manga chapter name is not returned by your mirror !</span>").appendTo(result);
      isOk = false;
    } else {
      if (res.currentChapter.trim() == $("option:selected", $("#lstChaps")).text().trim()) {
        $("<br/><span>Manga chapter name retrieved match selected manga chapter name</span>").appendTo(result);
      } else {
        $("<br/><span>Manga chapter name retrieved does not match selected manga chapter name (Required : " + $("option:selected", $("#lstChaps")).text().trim() + " ; found : " + res.currentChapter.trim() + ")</span>").appendTo(result);
        isWarn = true;
      }
    }
    if (res.currentChapterURL === undefined || res.currentChapterURL === null) {
      $("<br/><span>Manga chapter url is not returned by your mirror !</span>").appendTo(result);
      isOk = false;
    } else {
      if (res.currentChapterURL.trim() == $("#lstChaps").val().trim()) {
        $("<br/><span>Manga chapter url retrieved match selected manga chapter url</span>").appendTo(result);
      } else {
        $("<br/><span>Manga chapter url retrieved does not match selected manga chapter url (Required : " + $("#lstChaps").val().trim() + " ; found : " + res.currentChapterURL.trim() + ")</span>").appendTo(result);
        isOk = false;
      }
    }

    modifyResult("testinfos", result);
    if (isOk) {
      if (!isWarn) {
        modifyComment("testinfos", "Your mirror returns good informations for the current chapter page.");
        modifyStatut("testinfos", "O");
      } else {
        modifyComment("testinfos", "Your mirror returns good informations for the current chapter page. Names does not match but it is no big deal for the extension.");
        modifyStatut("testinfos", "W");
      }
    } else {
      modifyComment("testinfos", "Some informations are missing or are having problems");
      modifyStatut("testinfos", "K");
    }
    callback(isOk);
  });
}

function testImages(div) {
  addResult("testimgs", "L", "Test if list of chapter scans can be found in the background chapter page.", $("<span>Loading...</span>"), "");

  var lst = getMangaMirror($("#mirrorList").val()).getListImages($(div), $("#lstChaps").val());

  var res = $("<div></div>");
  var isOk = true;
  if (lst.length === 0) {
    $("<span>ERROR : List of images is empty for the selected chapter</span>").appendTo(res);
    modifyComment("testimgs", "Error while retrieving list of images");
    isOk = false;
  } else {
    $("<span>List of images successfully loaded (" + lst.length + " images found)</span>").appendTo(res);
    var sel = $("<select id=\"lstImgs\"></select>");

    for (var i = 0; i < lst.length; i++) {
      $("<option value=\"" + lst[i] + "\">" + lst[i] + "</option>").appendTo(sel);
    }
    $("<br />").appendTo(res);
    sel.css("max-width", "300px");
    sel.appendTo(res);

    $("<br />").appendTo(res);

    //Add a button
    $("<span>Select an image in the list and click on the test button to load tests for this image :</span>").appendTo(res);
    var but = $("<input type=\"button\" value=\"Test\"/>");
    but.appendTo(res);
    but.click(testImage);
    modifyComment("testimgs", "List of images loaded.");
  }
  modifyResult("testimgs", res);

  if (isOk) {
    modifyStatut("testimgs", "O");
    if ($("#auto").is(':checked')) {
      var index = Math.floor(Math.random()*$("option", $("#lstImgs")).size());
      $("option:nth-child(" + index + ")", $("#lstImgs")).attr("selected", "selected");
      testImage();
    }
  } else {
    modifyStatut("testimgs", "K");
  }
}

function testImage() {
  $("#testimg").remove();
  addResultAfter("testimgs", "testimg", "L", "Test if an image can be loaded.", $("<span>Loading...</span>"), "");

  var img = new Image();
  //== loadImage
  $(img).css("height", "100px");
  $(img).load(function() {
    modifyResult("testimg", $(img));
    modifyComment("testimg", "Image successfully loaded.");
    modifyStatut("testimg", "O");
  });
  $(img).error(function() {
    modifyResult("testimg", $("<span>Error while loading image</span>"));
    modifyComment("testimg", "An error occured while loading image, to debug it, follow this link : <a href=\"" + $("#lstImgs").val() + "\">"+ $("#lstImgs").val() + "</a>. You may desactivate the extension to see the page. If the image appears, problem may be due to your code, else, it comes from the mirror");
    modifyStatut("testimg", "W");
  });
  getMangaMirror($("#mirrorList").val()).getImageFromPageAndWrite($("#lstImgs").val(), img, document.getElementById("mangaChap").contentWindow.document.documentElement, $("#lstChaps").val());
}

function testNav(div) {
  var select = getMangaMirror($("#mirrorList").val()).getMangaSelectFromPage($(div), $("#lstChaps").val());
  //console.log(select);
  if (select === null) {
    select = $("<select></select>");
    $("option", $("#lstChaps")).each(function(index) {
      var optTmp = $("<option value=\"" + $(this).val() + "\">" + $(this).text() + "</option>");
      if ($(this).attr("selected")) {
        optTmp.attr("selected", true);
      }
      optTmp.appendTo($(select));
    });
  } else {
    select = $(select);
  }

  getMangaMirror($("#mirrorList").val()).doSomethingBeforeWritingScans($(div), $("#lstChaps option:selected").val());

  addResult("testnavplace", "L", "Test if the mirror returns a place to write navigation.", $("<span>Loading...</span>"), "");

  var where = $(getMangaMirror($("#mirrorList").val()).whereDoIWriteNavigation($(div), $("#lstChaps").val()));
  if (where === null || where === undefined || where.size() === 0) {
    modifyResult("testnavplace", $("<span>Your mirror does not return a place to write navigation</span>"));
    modifyComment("testnavplace", "KO");
    modifyStatut("testnavplace", "K");
  } else {
    if (where.size() != 2) {
      modifyResult("testnavplace", $("<span>Your mirror returns " + where.size() + " places to write navigation</span>"));
      modifyComment("testnavplace", "AMR recommends to return two places to write navigation. One on the top of the page, one at the bottom.");
      modifyStatut("testnavplace", "W");
    } else {
      modifyResult("testnavplace", $("<span>Your mirror returns 2 places to write navigation</span>"));
      modifyComment("testnavplace", "OK");
      modifyStatut("testnavplace", "O");
    }
  }

  addResult("testscansplace", "L", "Test if the mirror returns a place to write scans.", $("<span>Loading...</span>"), "");

  where = $(getMangaMirror($("#mirrorList").val()).whereDoIWriteScans($(div), $("#lstChaps").val()));
  if (where === null || where === undefined || where.size() === 0) {
    modifyResult("testscansplace", $("<span>Your mirror does not return a place to write scans</span>"));
    modifyComment("testscansplace", "KO");
    modifyStatut("testscansplace", "K");
  } else {
    if (where.size() != 1) {
      modifyResult("testscansplace", $("<span>Your mirror returns " + where.size() + " places to write scans</span>"));
      modifyComment("testscansplace", "Your need to return only one place to write scans.");
      modifyStatut("testscansplace", "K");
    } else {
      modifyResult("testscansplace", $("<span>Your mirror returns one place to write scans</span>"));
      modifyComment("testscansplace", "OK");
      modifyStatut("testscansplace", "O");
    }
  }

  addResult("testnavnext", "L", "Test if the mirror returns a valid next chapter.", $("<span>Loading...</span>"), "");
  testNavNext(div, select);
  addResult("testnavprev", "L", "Test if the mirror returns a valid previous chapter.", $("<span>Loading...</span>"), "");
  testNavPrev(div, select);
}

function testNavNext(div, select) {
  var nextUrl = getMangaMirror($("#mirrorList").val()).nextChapterUrl(select, $(div), $("#lstChaps").val());
  if (nextUrl === null || nextUrl === undefined || nextUrl.trim().length === 0) {
    modifyResult("testnavnext", $("<span>Next URL is empty, the current chapter must be the last chapter published. If not, check your code.</span>"));
    modifyComment("testnavnext", "Verify that the selected chapter is the latest published.");
    modifyStatut("testnavnext", "O");
  } else {
    //verify that chapter exists in list --> Warn
    var found = false;
    $("option", $("#lstChaps")).each(function(index) {
      if ($(this).val().trim() == nextUrl.trim()) {
        found = true;
      }
    });
    if (!found) {
      modifyResult("testnavnext", $("<span>Next URL : <a href=\"" + nextUrl + "\">" + nextUrl + "</a>. Next URL returned by your mirror does not exist in the list of chapters of this manga.</span>"));
      modifyComment("testnavnext", "This problem is not a real one if the following tests are OK (test load the next chapter url and verifies that the chapterURL returned is in the list).");
      modifyStatut("testnavnext", "W");
    } else {
      modifyResult("testnavnext", $("<span>Next URL : <a href=\"" + nextUrl + "\">" + nextUrl + "</a>. Next URL returned by your mirror exists in the list of chapters of this manga.</span>"));
      modifyComment("testnavnext", "OK");
      modifyStatut("testnavnext", "O");
    }
    loadChapterFromUrlAndTest(nextUrl, "next", "testnavnext");
  }
}
function testNavPrev(div, select) {
  var prevUrl = getMangaMirror($("#mirrorList").val()).previousChapterUrl(select, $(div), $("#lstChaps").val());
  if (prevUrl === null || prevUrl === undefined || prevUrl.trim().length === 0) {
    modifyResult("testnavprev", $("<span>Previous URL is empty, the current chapter must be the first chapter published. If not, check your code.</span>"));
    modifyComment("testnavprev", "Verify that the selected chapter is the first published.");
    modifyStatut("testnavprev", "O");
  } else {
    //verify that chapter exists in list --> Warn
    var found = false;
    $("option", $("#lstChaps")).each(function(index) {
      if ($(this).val().trim() == prevUrl.trim()) {
        found = true;
      }
    });
    if (!found) {
      modifyResult("testnavprev", $("<span>Previous URL : <a href=\"" + prevUrl + "\">" + prevUrl + "</a>. Previous URL returned by your mirror does not exist in the list of chapters of this manga.</span>"));
      modifyComment("testnavprev", "This problem is not a real one if the following tests are OK (test load the previous chapter url and verifies that the chapterURL returned is in the list).");
      modifyStatut("testnavprev", "W");
    } else {
      modifyResult("testnavprev", $("<span>Previous URL : <a href=\"" + prevUrl + "\">" + prevUrl + "</a>. Previous URL returned by your mirror exists in the list of chapters of this manga.</span>"));
      modifyComment("testnavprev", "OK");
      modifyStatut("testnavprev", "O");
    }
    loadChapterFromUrlAndTest(prevUrl, "previous", "testnavprev");
  }
}

function loadChapterFromUrlAndTest(urlLoad, libNP, idTestBefore) {
  addResultAfter(idTestBefore, libNP + "load", "L", "Load the " + libNP + " chapter in background", $("<span>Loading...</span>"), "");
  $("#chap" + libNP).remove();

  $.ajax({
    url: urlLoad,

    success: function(data) {
      var div = document.createElement( "iframe" );
      div.style.display = "none";
      $(div).attr("id", "chap" + libNP);
      document.body.appendChild(div);
      document.getElementById("chap" + libNP).contentWindow.document.documentElement.innerHTML = data;
      $(document.getElementById("chap" + libNP).contentWindow.document).ready(function() {
        modifyResult(libNP + "load", $("<span>The " + libNP + " chapter has been succesfully loaded</span>"));
        modifyComment(libNP + "load", "OK");
        modifyStatut(libNP + "load", "O");
        testNPChapter(urlLoad, libNP, libNP + "load");
      });
    },
    error: function() {
      modifyResult(libNP + "load", $("<span>Internal error while loading the " + libNP + " chapter in background. Check if the URL </span><a href=\"" + urlLoad + "\">"+urlLoad+"</a><span>can be loaded</span>"));
      modifyComment(libNP + "load", "KO");
      modifyStatut(libNP + "load", "K");
    }
  });
}

function testNPChapter(urlLoad, libNP, idTestBefore) {
  addResultAfter(libNP + "load", libNP + "testrecon", "L", "Test if the loaded " + libNP + " page is a chapter page (containing scans).", $("<span>Loading...</span>"), "");
  var res = getMangaMirror($("#mirrorList").val()).isCurrentPageAChapterPage(document.getElementById("chap" + libNP).contentWindow.document.documentElement, urlLoad);
  if (res) {
    modifyResult(libNP + "testrecon", $("<span>The " + libNP + " chapter page will be considered as containing scans</span>"));
    modifyComment(libNP + "testrecon", "OK");
    modifyStatut(libNP + "testrecon", "O");
    testNPRetURL(urlLoad, libNP, idTestBefore);
  } else {
    modifyResult(libNP + "testrecon", $("<span>The " + libNP + " chapter page is not recognized by your mirror as containing scans</span>"));
    modifyComment(libNP + "testrecon", "KO");
    modifyStatut(libNP + "testrecon", "K");
  }
}
function testNPRetURL(urlLoad, libNP, idTestBefore) {
  addResultAfter(libNP + "testrecon", libNP + "testinsideurl", "L", "Test if the manga informations can be retrieved from loaded " + libNP + " page.", $("<span>Loading...</span>"), "");
  getMangaMirror($("#mirrorList").val()).getInformationsFromCurrentPage(document.getElementById("chap" + libNP).contentWindow.document.documentElement, urlLoad, function(res) {
    var result = $("<div></div>");
    var isOk = true;
    $("<span>Informations retrieved from mirror for the " + libNP + " chapter : </span><br/><span>" + JSON.stringify(res) + "</span><br/>").appendTo(result);

    if (res.currentMangaURL === undefined || res.currentMangaURL === null) {
      $("<br/><span>Manga url is not returned by your mirror for the " + libNP + " chapter !</span>").appendTo(result);
      isOk = false;
    } else {
      if (res.currentMangaURL.trim() == $("#lstMangas").val().trim()) {
        $("<br/><span>Manga url retrieved match selected manga url for the " + libNP + " chapter </span>").appendTo(result);
      } else {
        $("<br/><span>Manga url retrieved does not match selected manga url for the " + libNP + " chapter (Required : " + $("#lstMangas").val().trim() + " ; found : " + res.currentMangaURL.trim() + ")</span>").appendTo(result);
        isOk = false;
      }
    }
    if (res.currentChapterURL === undefined || res.currentChapterURL === null) {
      $("<br/><span>Manga chapter url is not returned by your mirror for the " + libNP + " chapter!</span>").appendTo(result);
      isOk = false;
    } else {
      var found = false;
      $("option", $("#lstChaps")).each(function(index) {
        if ($(this).val().trim() == res.currentChapterURL.trim()) {
          found = true;
        }
      });
      if (found) {
        $("<br/><span>Manga chapter url retrieved for the " + libNP + " chapter exists in the chapter list of the current manga</span>").appendTo(result);
      } else {
        $("<br/><span>Manga chapter url retrieved does not exist in chapters list (url retrieved : " + res.currentChapterURL.trim() + ")</span>").appendTo(result);
        isOk = false;
      }
    }

    modifyResult(libNP + "testinsideurl", result);
    if (isOk) {
      modifyComment(libNP + "testinsideurl", "Your mirror returns good informations for the " + libNP + " chapter page.");
      modifyStatut(libNP + "testinsideurl", "O");
    } else {
      modifyComment(libNP + "testinsideurl", "Some informations are missing or are having problems in the " + libNP + " chapter page.");
      modifyStatut(libNP + "testinsideurl", "K");
    }
  });
}

function testHand() {
  addResult("testhand", "H", "Test the aspect of the manga page.", $("<span>You must test if the page is well displayed, if the navigation bars are at their right places, if the full chapter is well displayed, if there are no display bugs on the result page. To test it, follow the link : </span><a href=\"" + $("#lstChaps").val() + "\">" + $("#lstChaps").val() + "</a>"), "");
}

function addResult(idTest, statut, testTxt, res, comment) {
  var tr = $("<tr id=\"" + idTest + "\"></tr>");

  var tdStat = $("<td class=\"statut\"></td>");
  if (statut=="L") {
    $("<img src=\"img/lab_load.gif\" width=\"24\" height=\"24\"/>" ).appendTo(tdStat);
  } else if (statut=="O") {
    $("<img src=\"img/lab_ok.png\" width=\"24\" height=\"24\"/>" ).appendTo(tdStat);
  } else if (statut=="K") {
    $("<img src=\"img/lab_ko.png\" width=\"24\" height=\"24\"/>" ).appendTo(tdStat);
  } else if (statut=="W") {
    $("<img src=\"img/warn.png\" width=\"24\" height=\"24\"/>" ).appendTo(tdStat);
  } else if (statut=="H") {
    $("<img src=\"img/lab_hand.png\" width=\"24\" height=\"24\"/>" ).appendTo(tdStat);
  }

  tdStat.css("text-align", "center");
  var tdTxt = $("<td class=\"test\"><span>" + testTxt+"</span></td>");
  var tdRes = $("<td class=\"res\"></td>");
  res.appendTo(tdRes);
  var tdComment = $("<td class=\"comment\"></td>");
  $(comment).appendTo(tdComment);

  tdStat.appendTo(tr);
  tdTxt.appendTo(tr);
  tdRes.appendTo(tr);
  tdComment.appendTo(tr);

  tr.appendTo($("#resZone"));
  pyjama();
}

function addResultAfter(idPrec, idTest, statut, testTxt, res, comment) {
  var tr = $("<tr id=\"" + idTest + "\"></tr>");

  var tdStat = $("<td class=\"statut\"></td>");
  if (statut=="L") {
    $("<img src=\"img/lab_load.gif\" width=\"24\" height=\"24\"/>" ).appendTo(tdStat);
  } else if (statut=="O") {
    $("<img src=\"img/lab_ok.png\" width=\"24\" height=\"24\"/>" ).appendTo(tdStat);
  } else if (statut=="K") {
    $("<img src=\"img/lab_ko.png\" width=\"24\" height=\"24\"/>" ).appendTo(tdStat);
  } else if (statut=="W") {
    $("<img src=\"img/warn.png\" width=\"24\" height=\"24\"/>" ).appendTo(tdStat);
  } else if (statut=="H") {
    $("<img src=\"img/lab_hand.png\" width=\"24\" height=\"24\"/>" ).appendTo(tdStat);
  }
  tdStat.css("text-align", "center");
  var tdTxt = $("<td class=\"test\"><span>" + testTxt+"</span></td>");
  var tdRes = $("<td class=\"res\"></td>");
  res.appendTo(tdRes);
  var tdComment = $("<td class=\"comment\"></td>");
  $(comment).appendTo(tdComment);

  tdStat.appendTo(tr);
  tdTxt.appendTo(tr);
  tdRes.appendTo(tr);
  tdComment.appendTo(tr);

  $("#" + idPrec).after(tr);
  pyjama();
}

function pyjama() {
  $("tr", $("#resZone")).each(function(index) {
    $(this).removeClass("even");
    $(this).removeClass("odd");
    if (index % 2 === 0) {
      $(this).addClass("even");
    } else {
      $(this).addClass("odd");
    }
  });
}
function modifyStatut(idTest, statut) {
  $(".statut", $("#" + idTest)).empty();
  if (statut=="L") {
    $("<img src=\"img/lab_load.gif\" width=\"24\" height=\"24\"/>" ).appendTo($(".statut", $("#" + idTest)));
  } else if (statut=="O") {
    $("<img src=\"img/lab_ok.png\" width=\"24\" height=\"24\"/>" ).appendTo($(".statut", $("#" + idTest)));
  } else if (statut=="K") {
    $("<img src=\"img/lab_ko.png\" width=\"24\" height=\"24\"/>" ).appendTo($(".statut", $("#" + idTest)));
  } else if (statut=="W") {
    $("<img src=\"img/warn.png\" width=\"24\" height=\"24\"/>" ).appendTo($(".statut", $("#" + idTest)));
  } else if (statut=="H") {
    $("<img src=\"img/lab_hand.png\" width=\"24\" height=\"24\"/>" ).appendTo($(".statut", $("#" + idTest)));
  }
}

function modifyResult(idTest, res) {
  $(".res", $("#" + idTest)).empty();
  res.appendTo($(".res", $("#" + idTest)));
}

function modifyComment(idTest, comment) {
  $(".comment", $("#" + idTest)).empty();
  $("<span>" + comment + "</span>").appendTo($(".comment", $("#" + idTest)));
}

function resetAfter(idTest) {
  var nxt = $("#" + idTest).next();
  while (nxt.size() !== 0) {
    nxt.remove();
    nxt = $("#" + idTest).next();
  }
  pyjama();
}
