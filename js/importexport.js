$(function() {
  loadMenu("impexp");
  $(".article").show();
  $(".ongletCont[id!='ong1']").hide();
  $('.tabs li').on('click', function(evt) {
    var ong = ($(this).text() == 'Import') ? 'ong1' : 'ong2';
    switchOnglet(this, ong);
  });
  $('#importdata').on('click', importData);
  $('#exportdata').on('click', exportData);
  $('#copytoclip').on('click', copy);
});

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
  setTimeout(function() {
    chrome.extension.sendRequest(request, function(response) {
      //setTimeout(function() {
      //Do the callback
      callback(response);
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
  }, 10);
}

function exportData() {
  var expMgs = $("#mgCk").prop("checked");
  var expBms = $("#bmCk").prop("checked");
  /*chrome.tabs.create({url: "export.html?mg=" + expMgs + "&bm=" + expBms}, function(tab) {
    });*/
  var res = {};
  if (expMgs) {
    var mgs = chrome.extension.getBackgroundPage().getJSONListToSync();
    res.mangas = mgs;
  }

  if (expBms) {
    res.bookmarks = chrome.extension.getBackgroundPage().bookmarks;
  }

  $("#exportBox").html(JSON.stringify(res));
  $("#resExp").show();

}

function copy() {
  chrome.extension.getBackgroundPage().setclipboard($("#exportBox").text());
  alert("Data have been saved to clipboard.");
}

var data;

function importData() {
  var resImp = $('#resImp');
  resImp.hide();
  try {
    data = JSON.parse($("#importBox").val());
  } catch (e) {
    alert("Error while parsing data in the hereinabove box...");
    return;
  }
  //console.log(data);
  resImp.empty();
  if (data.mangas) {
    $("<div class='resImpDiv'><span class='resImport'>" + JSON.parse(data.mangas).length + " mangas found.</span><div class='button' id='btnMangaMerge'>Import manga list (merge)</div><div class='button' id='btnMangaErase'>Import manga list (erase)</div></div>").appendTo(resImp);
    $('#btnMangaMerge').on('click', function() {
      importManga(this, true);
    });
    $('#btnMangaErase').on('click', function() {
      importManga(this, false);
    });
  }
  if (data.bookmarks) {
    $("<div class='resImpDiv'><span class='resImport'>" + JSON.parse(data.bookmarks).length + " bookmarks found.</span><div class='button' id='btnBookMerge'>Import bookmark list (merge)</div><div class='button' id='btnBookErase'>Import bookmark list (erase)</div></div>").appendTo(resImp);
    $('#btnBookMerge').on('click', function() {
      importBookmark(this, true);
    });
    $('#btnBookErase').on('click', function() {
      importBookmark(this, false);
    });
  }
  resImp.show();
}

function importManga(but, mergeVal) {
  var obj = {
    action: "importMangas",
    mangas: JSON.parse(data.mangas),
    merge: mergeVal
  };
  sendExtRequest(obj, $(but), function(resp) {
    $("#resultBout").remove();
    $("<center><textarea id='resultBout' cols='90' rows='10' ></textarea></center>").appendTo($("#resImp"));
    $("#resultBout").val(resp.out);
  }, true);

}

function importBookmark(but, mergeVal) {
  var obj = {
    action: "importBookmarks",
    bookmarks: JSON.parse(data.bookmarks),
    merge: mergeVal
  };
  sendExtRequest(obj, $(but), function(resp) {
    $("#resultBout").remove();
    $("<center><textarea id='resultBout' cols='90' rows='10' ></textarea></center>").appendTo($("#resImp"));
    $("#resultBout").val(resp.out);
  }, true);
}

function switchOnglet(ong, tab) {
  $(".tab").removeClass("checked");
  $(ong).addClass("checked");
  $(".ongletCont").each(function(index) {
    var $this = $(this);
    if ($this.attr("id") == tab) {
      $this.show();
    } else {
      $this.hide();
    }
  });
}

// uneeded and redundant
// function getElementsByClass(searchClass, obj) {
//   if (!obj) {
//     obj = document;
//   }

//   var classElements = [];
//   var els = document.getElementsByTagName('*');
//   var elsLen = els.length;
//   for (i = 0, j = 0; i < elsLen; i++) {
//     var classes = els[i].className.split(' ');
//     for (k = 0; k < classes.length; k++)
//     if (classes[k] == searchClass) classElements[j++] = els[i];
//   }
//   return classElements;
// }