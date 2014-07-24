var nbclasses = 0;
var mirrors;
var states;

$(function() {
  //Load mirrors definitions
  chrome.runtime.sendMessage({action: "actmirrors"}, function(res) {
    mirrors = res;
    // access localStorage via background
    chrome.runtime.sendMessage({action: "searchMirrorsState"}, function(locms) {
      if (locms.res != undefined) {
        states = JSON.parse(locms.res);
      }
      update();
    });
  });
});

function update() {
  var tmpcn = $(".manganameforamr").size();
  if (tmpcn != nbclasses) {
    $(".amrfind").remove();
    $("<img class=\"amrfind\" src=\"" + chrome.extension.getURL("img/find.png") + "\"></img>").appendTo($(".manganameforamr"));
    $(".amrfind").css("float", "right");
    $(".amrfind").click(clickSearch);
  }
  nbclasses = tmpcn;
  if (nbclasses < 200) {
    setTimeout("update()", 500);
  }
}

function clickSearch() {
  loadSearch($(this).closest("td"), $(this).closest("td").text());
}

function isMirrorEnabled(mirrorName) {
  if (states != undefined) {
    for (var i = 0; i < states.length; i++) {
      if (states[i].mirror == mirrorName) {
        return states[i].state;
      }
    }
  }
  return true;
}

function loadSearch(td, toSearch) {
  td.data("nbToLoad", mirrors.length);
  td.data("ancNbToLoad", mirrors.length);
  $(".amrfind", td).attr("src", chrome.extension.getURL("img/load16.gif"));
  $(".amrfind", td).unbind("click");
  
  var tr;
  var restd;
  //Create result zone if needed
  if (td.closest("tr").next().is(".searchResultstr")) {
    tr = td.closest("tr").next();
    restd = $(".resultssearch", tr);
    restd.empty();
  } else {
    tr = $("<tr class='searchResultstr'><td><img class='return' src='" + chrome.extension.getURL("img/return.png") + "'/></td><td class='resultssearch' colspan='2'></td></tr>");
    restd = $(".resultssearch", tr);
    td.closest("tr").after(tr);
  }
  //Fill it
  for (var i = 0; i < mirrors.length; i++) {
    if (isMirrorEnabled(mirrors[i].mirrorName)) {
      if (mirrors[i].canListFullMangas) {
        // Search in manga list matching entries
        var listManga = mirrors[i].listmgs;
        if (listManga != undefined) {
          var listMangaCtx = JSON.parse(listManga);
          if (listMangaCtx.length > 0) {
            for (var j = 0; j < listMangaCtx.length; j++) {
              if (formatMgName(listMangaCtx[j][0]) == formatMgName(toSearch)) {
                var obj = {};
                obj.url = listMangaCtx[j][1];
                obj.name = listMangaCtx[j][0];
                obj.mirror = mirrors[i].mirrorName;
                addResult(restd, obj, toSearch);
              }
            }
          }
        }
        td.data("nbToLoad", td.data("nbToLoad") - 1);
      } else {
        // Request mirror to search.
        // call background to search res
        chrome.runtime.sendMessage({action: "searchManga", mirrorName: mirrors[i].mirrorName, search: toSearch}, function(resp) {
          for (var j = 0; j < resp.list.length; j++) {
            if (formatMgName(resp.list[j][0]) == (formatMgName(toSearch))) {
              var obj = {};
              obj.url = resp.list[j][1];
              obj.name = resp.list[j][0];
              obj.mirror = resp.mirrorName;
              addResult(restd, obj, toSearch);
            }
          }
          td.data("nbToLoad", td.data("nbToLoad") - 1);
        });
      }
    } else {
      td.data("nbToLoad", td.data("nbToLoad") - 1);
      td.data("ancNbToLoad", td.data("ancNbToLoad") - 1);
    }
  }
  waitForEndLoad(td);
}

function waitForEndLoad(td) {
  if (td.data("nbToLoad") != td.data("ancNbToLoad")) {
    td.data("ancNbToLoad", td.data("nbToLoad"));
  }
  if (td.data("nbToLoad") != 0) {
    setTimeout(function() {
      waitForEndLoad(td);
    }, 500);
  } else {
    $(".amrfind", td).attr("src", chrome.extension.getURL("img/find.png"));
    $(".amrfind", td).click(clickSearch);
  }
}

function addResult(tdRes, obj, name) {
  var found = false;
  $(".mirrorsearchimg", tdRes).each(function(index) {
    if ($(this).data("mirrorname") == obj.mirror) {
      found = true;
    }
  });
  if (!found) {
    var urlCur = obj.url;
    var mirrorCur = obj.mirror;
    var img = $("<img class='mirrorsearchimg' src='" + chrome.extension.getURL(getMangaMirror(obj.mirror).mirrorIcon) + "' title=\"" + name + " on " + obj.mirror + "\" />");
    img.data("urlmirror", urlCur);
    img.data("mirrorname", obj.mirror);
    img.data("manganame", name);
    var divelt = $("<div class='eltmirrorsearch'><img class='addsinglemg' src='" + chrome.extension.getURL("img/addlt.png") + "' title='Add this manga in your list on " + obj.mirror + "'/></div>");
    divelt.prepend(img);
    divelt.appendTo(tdRes);
    //events binding
    bindEvents();
    //Sort mangas pictures 
    $(".eltmirrorsearch", tdRes).sortElements(function(a, b) {
      var at = $(".mirrorsearchimg", $(a)).data("mirrorname");
      var bt = $(".mirrorsearchimg", $(b)).data("mirrorname");
      return at > bt ? 1 : -1;
    });
  }
}
function bindEvents() {
  $(".mirrorsearchimg").unbind("click");
  $(".mirrorsearchimg").click(function() {
    chrome.runtime.sendMessage({action: 'opentab', url: $(this).data("urlmirror")}, function(response) {});
  });
  $(".addsinglemg").unbind("click");
  $(".addsinglemg").click(function() {
    var img = $("img.mirrorsearchimg", $(this).closest(".eltmirrorsearch"));
    var obj = {action: "readManga", 
              mirror: img.data("mirrorname"),
              url: img.data("urlmirror"),
              name: img.data("manganame")};
    sendExtRequestS(obj, $(this), function() {
    }, true);
  });
}

function formatMgName(name) {
  if (name == undefined || name == null || name == "null") return "";
  return name.trim().replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

//Used to request background page action
function sendExtRequestS(request, button, callback, backsrc) {
  //Prevent a second request
  if (button.data("currentlyClicked")) return;
  button.data("currentlyClicked", true);
  
  //Display a loading image
  var _ancSrc;
  if (button.is("img")) {
    _ancSrc = button.attr("src");
    button.attr("src", chrome.extension.getURL("img/load16.gif"));
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
    }
    //Restore request
    button.removeData("currentlyClicked");
  //}, 1000);
  });
}

/**
 * jQuery.fn.sortElements
 * --------------
 * @param Function comparator:
 *   Exactly the same behaviour as [1,2,3].sort(comparator)
 *   
 * @param Function getSortable
 *   A function that should return the element that is
 *   to be sorted. The comparator will run on the
 *   current collection, but you may want the actual
 *   resulting sort to occur on a parent or another
 *   associated element.
 *   
 *   E.g. $('td').sortElements(comparator, function(){
 *      return this.parentNode; 
 *   })
 *   
 *   The <td>'s parent (<tr>) will be sorted instead
 *   of the <td> itself.
 */
jQuery.fn.sortElements = (function(){
 
    var sort = [].sort;
 
    return function(comparator, getSortable) {
 
        getSortable = getSortable || function(){return this;};
 
        var placements = this.map(function(){
 
            var sortElement = getSortable.call(this),
                parentNode = sortElement.parentNode,
 
                // Since the element itself will change position, we have
                // to have some way of storing its original position in
                // the DOM. The easiest way is to have a 'flag' node:
                nextSibling = parentNode.insertBefore(
                    document.createTextNode(''),
                    sortElement.nextSibling
                );
 
            return function() {
 
                if (parentNode === this) {
                    throw new Error(
                        "You can't sort elements if any one is a descendant of another."
                    );
                }
 
                // Insert before flag:
                parentNode.insertBefore(this, nextSibling);
                // Remove flag:
                parentNode.removeChild(nextSibling);
 
            };
 
        });
 
        return sort.call(this, comparator).each(function(i){
            placements[i].call(getSortable.call(this));
        });
 
    };
 
})();
