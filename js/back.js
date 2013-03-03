var currentMirror = null;
var amrWhereScans;
var useLeftRightKeys = false;
var autoBookmarkScans = false;
var prefetchChapter = false;
var nextRight = false;
var idStat;
var timespent = 0;
var starttime = new Date().getTime();
var updatetime = 10000;
var isActive = true;
var sendStats = false;
var lastpresstime;
var dirpress;
var timeoutAMRbar = 0;
var times = [];
var debugTimes = false;

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
  "use strict";
  currentMirror = object;
}

function getMangaMirror() {
  /*for (var i = 0; i < mirrors.length; i += 1) {
  if (mirrors[i].isMe(window.location.href)) {
  return mirrors[i];
  }
  }
  return null;*/
  "use strict";
  return currentMirror;
}

function removeBanner() {
  "use strict";
  var obj = {};
  obj.action = "parameters";
  chrome.extension.sendRequest(obj, function (response) {
    if (response.displayAdds === 0) {
      getMangaMirror().removeBanners(document, window.location.href);
    }
  });
}
function getTarget(e) {
  "use strict";
  e = e || window.event;
  return e.target || e.srcElement;
}
function getTopPlus() {
  "use strict";
  var ret;
  if (document.body.style.borderTopWidth !== undefined && document.body.style.borderTopWidth !== "") {
    ret = parseInt(document.body.style.borderTopWidth, 10);
  } else {
    ret = 0;
  }
  //console.log(ret);
  return ret;
}
function setHWZoom(img) {
  "use strict";
  $(img).css("height", $(img).data("zoom") * $(img).data("baseheight") + "px");
  $(img).css("width", $(img).data("zoom") * $(img).data("basewidth") + "px");
  $(img).css("max-width", "none");
}

function zoomin() {
  "use strict";
  var ancheight = document.body.offsetHeight - getTopPlus(),
    newheight = document.body.offsetHeight - getTopPlus(),
    ratioY = (newheight / ancheight);
  $(".imageAMR").each(function (index) {
    if ($(this).data("zoom")) {
      $(this).data("zoom", $(this).data("zoom") * 1.2);
    } else {
      $(this).data("zoom", 1.2);
      $(this).data("baseheight", $(this).height());
      $(this).data("basewidth", $(this).width());
    }
    setHWZoom(this);
  });
  $.scrollTo('50%', {
    axis : 'x'
  });
  window.scrollBy(0, window.scrollY * (ratioY - 1));
}
function zoomout() {
  "use strict";
  var ancheight = document.body.offsetHeight - getTopPlus(),
    newheight = document.body.offsetHeight - getTopPlus(),
    ratioY = (newheight / ancheight);
  $(".imageAMR").each(function (index) {
    if ($(this).data("zoom")) {
      $(this).data("zoom", $(this).data("zoom") * 0.833);
    } else {
      $(this).data("zoom", 0.833);
      $(this).data("baseheight", $(this).height());
      $(this).data("basewidth", $(this).width());
    }
    setHWZoom(this);
  });

  $.scrollTo('50%', {
    axis : 'x'
  });
  window.scrollBy(0, window.scrollY * (ratioY - 1));
}
function elementInViewport2(el) {
  "use strict";
  var top = el.offsetTop,
    left = el.offsetLeft,
    width = el.offsetWidth,
    height = el.offsetHeight;
  while (el.offsetParent) {
    el = el.offsetParent;
    top += el.offsetTop;
    left += el.offsetLeft;
  }
  top += el.offsetTop;
  left += el.offsetLeft;

  //console.log("top : " + top + " ; height : " + height + " ; wyo : " + window.pageYOffset + " ; wyo + wih : " + (window.pageYOffset + window.innerHeight));
  //left < (window.pageXOffset + window.innerWidth) &&
  //(left + width) > window.pageXOffset
  return (top < (window.pageYOffset + window.innerHeight) && (top + height) > window.pageYOffset);
}
function bottomVisible(el) {
  "use strict";
  var top = el.offsetTop,
    height = el.offsetHeight;
  while (el.offsetParent) {
    el = el.offsetParent;
    top += el.offsetTop;
  }
  top += el.offsetTop;
  //console.log("t+h " + (top + height) + " ; wt+wh " + window.pageYOffset + window.innerHeight );
  return ((top + height) <= window.pageYOffset + window.innerHeight);
}
function topVisible(el) {
  "use strict";
  var top = el.offsetTop,
    height = el.offsetHeight;
  while (el.offsetParent) {
    el = el.offsetParent;
    top += el.offsetTop;
  }
  top += el.offsetTop;
  return (top >= (window.pageYOffset));
}

function whichImageIsFirst(needFirst) {
  "use strict";
  var resp = null;
  $(".AMRtable tr").each(function (index) {
    var isVisible = false;
    $(".spanForImg img", $(this)).each(function (index) {
      if (elementInViewport2(this)) {
        isVisible = true;
      }
    });
    //console.log("isVisible : " + isVisible);
    if (isVisible) {
      if (!needFirst && resp === null) {
        //Return the last scan of the first visible tr
        resp = $(".spanForImg", $(this)).sort(function (a, b) {
          var nba = $(a).data("order"),
            nbb = $(b).data("order");
          return ((nba < nbb) ? -1 : ((nba === nbb) ? 0 : 1));
        }).last();
      } else if (needFirst) {
        //return the first scan of the last visible tr
        resp = $(".spanForImg", $(this)).sort(function (a, b) {
          var nba = $(a).data("order"),
            nbb = $(b).data("order");
          return ((nba < nbb) ? -1 : ((nba === nbb) ? 0 : 1));
        }).first();
      }
    }
  });
  return resp;
}
function topbotVis(spanFimg) {
  "use strict";
  var isTopVisible = true,
    isBotVisible = true,
    fTop = $("img:visible", $(spanFimg)).sort(function (a, b) {
      var aTop = a.offsetTop + a.offsetParent.offsetTop,
        bTop = b.offsetTop + b.offsetParent.offsetTop;
      //console.log("Top : a : " + aTop + " ; b : " + bTop + " --> " + ((aTop < bTop) ? -1 : ((aTop === bTop) ? 0 : 1)));
      return ((aTop < bTop) ? -1 : ((aTop === bTop) ? 0 : 1));
    }).first(),
  //console.log(fTop);
    lBot = $("img:visible", $(spanFimg)).sort(function (a, b) {
      var aBot = a.offsetTop + a.offsetHeight + a.offsetParent.offsetTop + a.offsetParent.offsetHeight,
        bBot = b.offsetTop + b.offsetHeight + b.offsetParent.offsetTop + b.offsetParent.offsetHeight;
      //console.log("Bottom : a : " + aBot + " ; b : " + bBot + " --> " + ((aBot < bBot) ? -1 : ((aBot === bBot) ? 0 : 1)));
      return ((aBot < bBot) ? -1 : ((aBot === bBot) ? 0 : 1));
    }).last();
  //console.log(lBot);
  if (!topVisible(fTop[0])) {
    isTopVisible = false;
  }
  if (!bottomVisible(lBot[0])) {
    isBotVisible = false;
  }
  //console.log({bottomVis: isBotVisible, topVis: isTopVisible});
  return {
    bottomVis : isBotVisible,
    topVis : isTopVisible
  };
}
function scrollbotoffset(el) {
  "use strict";
  var height = el.offsetHeight;
  return height - window.innerHeight - 45;
}

// AllowRightClickExtension  b46758b07fec implementation with modifications
// https://code.google.com/p/regis/source/browse/chrome-extensions/allowrightclick/
// reduces memory footprint with a single named function
function bringBackDefault(event) {
  "use strict";
  event.returnValue = true;
}
function removeContextMenuOn(elt) {
  //hope I won't break the extension anywhere
  //void(elt.oncontextmenu=null);
  //more general than elt.oncontextmenu     
  "use strict";
  elt.addEventListener("contextmenu", bringBackDefault, false);
//  elt.addEventListener("contextmenu", bringBackDefault, false);
}

function removeContextOnAll(eltName) {
  "use strict";
  var elements = document.getElementsByTagName(eltName),
    i;
  //for (var e in elements) {
  for (i = 0; i < elements.length; i += 1) {
    removeContextMenuOn(elements[i]);
  }
}

function enableContextMenu() {
  "use strict";
  // Stop using void() and preffering 
  document.ondragstart = function () { return null; };
  document.onselectstart = function () { return null; };
  document.onclick = function () { return null; };
  document.onmousedown = function () { return null; };
  document.onmouseup = function () { return null; };
  document.body.oncontextmenu = function () { return null; };
  removeContextMenuOn(document);
  removeContextOnAll("body");
  removeContextOnAll("img");
  removeContextOnAll("td");
  removeContextOnAll("div");
  removeContextOnAll("dl");
}
  //disable default websites shortcuts
function restoreKeys() {
  "use strict";
  document.onkeypress = function () { return null; };
  document.onkeydown = function () { return null; };
  document.onkeyup = function () { return null; };
  document.removeEventListener("keydown");
  document.removeEventListener("keypress");
  document.removeEventListener("keyup");
  $(document).unbind('keyup');
  $(document).unbind('keydown');
  $(document).unbind('keypress');
  //$(document).keyup(stopEventProp);
  //$(document).keydown(stopEventProp);
  //$(document).keypress(stopEventProp);
  //$(document).delegate('*', 'keyup', stopEventProp);
  //$(document).delegate('*', 'keydown', stopEventProp);
  //$(document).delegate('*', 'keypress', stopEventProp);
}
function setKeys() {
  "use strict";
  restoreKeys();

  $(document).keydown(function (e) {
    var t = getTarget(e),
      doubleTap,
      curimg,
      viss,
      nb;
    if (!((t.type && t.type === "text") || t.nodeName.toLowerCase() === "textarea")) {
      if (e.which === 87) { //W
        window.scrollBy(0, -40);
      }
      if (e.which === 83) { //S
        window.scrollBy(0, 40);
      }
      if (e.which === 107) { //+
        zoomin();
      }
      if (e.which === 109) { //-
        zoomout();
      }
      if (e.which === 66) { //b
        if ($("#pChapBtn0").size() > 0) {
          window.location.href = $("#pChapBtn0").attr("href");
        }
      }
      if (e.which === 78) { //n
        if ($("#nChapBtn0").size() > 0) {
          window.location.href = $("#nChapBtn0").attr("href");
        }
      }
      if (useLeftRightKeys) {
        //Left key or A
        if ((e.which === 37) || (e.which === 65)) {
          doubleTap = false;
          if (lastpresstime !== undefined && new Date().getTime() - lastpresstime < 500 && dirpress !== undefined && dirpress === 1) {
            doubleTap = true;
          }
          dirpress = 1;
          lastpresstime = new Date().getTime();
          //Get first visible image
          curimg = whichImageIsFirst(true);
          if (curimg !== null && curimg.size() > 0) {
            //Check if top and bottom of this image are visible
            viss = topbotVis(curimg);
            //If top not visible
            if (!viss.topVis && !doubleTap) {
              //Move to top of current scan
              $.scrollTo($(curimg).closest("tr")[0], 800, {
                queue : true,
                offset : {
                  top : getTopPlus()
                }
              });
            } else {
              //Calculate previous scan id
              nb = curimg.data("order") - 1;
              if (nb === -1) {
                //Current scan was first scan, move to top
                $.scrollTo($(document.body), 800, {
                  queue : true
                });
              } else {
                //Move to bottom of previous scan
                $(".spanForImg").each(function (index) {
                  if ($(this).data("order") === nb) {
                    $.scrollTo($(this).closest("tr")[0], 800, {
                      queue : true,
                      offset : {
                        top : scrollbotoffset($(this).closest("tr")[0]) + getTopPlus()
                      }
                    });
                  }
                });
              }
            }
          }
          e.preventDefault();
          e.stopPropagation();
        }
        //Right key or D
        if ((e.which === 39) || (e.which === 68)) {
          doubleTap = false;
          if (lastpresstime !== undefined && new Date().getTime() - lastpresstime < 500 && dirpress !== undefined && dirpress === 2) {
            doubleTap = true;
          }
          lastpresstime = new Date().getTime();
          dirpress = 2;
          //If we are at top of the page --> move to first scan
          if (window.pageYOffset === 0) {
            nb = 0;
            $(".spanForImg").each(function (index) {
              if ($(this).data("order") === nb) {
                $.scrollTo($(this).closest("tr")[0], 800, {
                  queue : true,
                  offset : {
                    top : getTopPlus()
                  }
                });
              }
            });
          } else {
            if (window.pageYOffset >= document.documentElement.scrollHeight - window.innerHeight) {
              if (nextRight) {
                if ($("#nChapBtn0").size() > 0) {
                  //console.log(window.pageYOffset + " --> " + (document.documentElement.scrollHeight) + " -- " + (window.innerHeight));
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
                $.scrollTo($(curimg).closest("tr")[0], 800, {
                  queue : true,
                  offset : {
                    top : scrollbotoffset($(curimg).closest("tr")[0]) + getTopPlus()
                  }
                });
              } else {
                //Calculate next scan id
                nb = curimg.data("order") + 1;
                if (nb >= $(".spanForImg").size()) {
                  //Current scan was last scan -> move to bottom of page
                  $.scrollTo($(document.body), 800, {
                    queue : true,
                    offset : {
                      top : document.body.offsetHeight + getTopPlus()
                    }
                  });
                } else {
                  // Move to top of next scan
                  $(".spanForImg").each(function (index) {
                    if ($(this).data("order") === nb) {
                      $.scrollTo($(this).closest("tr")[0], 800, {
                        queue : true,
                        offset : {
                          top : getTopPlus()
                        }
                      });
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
    //} else {
      //alert("TEXT FIELD FOCUS");
      /*$(t).keydown(e);
      e.preventDefault();
      e.stopPropagation();*/
    }
    //e.preventDefault();
  });

  var timer = window.setInterval(function () {
      if (/loaded|complete/.test(document.readyState)) {
        window.clearInterval(timer);
        enableContextMenu();
      }
    }, 100);
}

function createDataDiv(res) {
  "use strict";
  //Create modal form for bookmarks
  var divData = $("<div id='bookmarkData' style='display:none'></div>");
  $("<span>This div is used to store data for AMR</span>").appendTo(divData);
  divData.appendTo($(document.body));
  divData.data("mirror", getMangaMirror().mirrorName);
  divData.data("url", res.currentMangaURL);
  divData.data("chapUrl", res.currentChapterURL);
  divData.data("name", res.name);
  divData.data("chapName", res.currentChapter);
}
function createBar(barVis) {
  "use strict";
  var div = $("<div id='AMRBar'></div>"),
    divIn = $("<div id='AMRBarIn'></div>"),
    img = $("<img src='" + chrome.extension.getURL("img/icon-32.png") + "' width='20px;'/>"),
    divContent = $("<div></div>"),
    divBottom = $("<div></div>"),
    imgBtn = $("<img src='" + chrome.extension.getURL("img/down.png") + "' width='16px;' title='Hide AMR Toolbar'/>"),
    divInLtl = $("<div id='AMRBarInLtl'></div>"),
    imgLtl = $("<img src='" + chrome.extension.getURL("img/icon-32.png") + "' width='40px;' title='Display AMR ToolBar'/>");

  img.appendTo(divIn);
  divContent.appendTo(divIn);
  divContent.css("display", "inline-block");
  divBottom.css("display", "inline-block");
  imgBtn.appendTo(divBottom);
  imgBtn.click(function () {
    chrome.extension.sendRequest({
      action : "hideBar"
    }, function (response) {
      if (response.res === 1) {
        if ($("#AMRBarIn").data("temporary")) {
          $("#AMRBarIn").removeData("temporary");
          if (timeoutAMRbar !== 0) {
            clearTimeout(timeoutAMRbar);
          }
        }
        $("#AMRBarInLtl").fadeOut('fast', function () {
          $("#AMRBar").css("text-align", "center");
          $("#AMRBarIn").fadeIn();
        });
      } else {
        $("#AMRBarIn").fadeOut('fast', function () {
          $("#AMRBar").css("text-align", "left");
          $("#AMRBarInLtl").fadeIn(function () {
            $(this).css("display", "inline-block");
          });
        });
      }
    });

  });

  div.mouseenter(function () {
    if (timeoutAMRbar !== 0) {
      clearTimeout(timeoutAMRbar);
    }
    if (!$("#AMRBarIn", $(this)).is(":visible")) {
      $("#AMRBarIn").data("temporary", true);
      $("#AMRBarInLtl").fadeOut('fast', function () {
        $("#AMRBar").css("text-align", "center");
        $("#AMRBarIn").fadeIn();
      });
    }
  });

  div.mouseleave(function () {
    if ($("#AMRBarIn").data("temporary")) {
      if (timeoutAMRbar !== 0) {
        clearTimeout(timeoutAMRbar);
      }
      timeoutAMRbar = setTimeout(function () {
        $("#AMRBarIn").removeData("temporary");
        $("#AMRBarIn").fadeOut('fast', function () {
          $("#AMRBar").css("text-align", "left");
          $("#AMRBarInLtl").fadeIn(function () {
            $(this).css("display", "inline-block");
          });
        });
      }, 2000);
    }
  });

  divBottom.appendTo(divIn);
  divInLtl.css("display", "inline-block");

  imgLtl.css("margin-top", "-10px");
  imgLtl.css("margin-left", "-10px");
  imgLtl.css("cursor", "pointer");

  imgLtl.appendTo(divInLtl);
  imgLtl.click(function () {
    $("#AMRBarInLtl").fadeOut('fast', function () {
      $("#AMRBar").css("text-align", "center");
      $("#AMRBarIn").fadeIn();
      chrome.extension.sendRequest({
        action : "showBar"
      }, function (response) {});
    });
  });

  divIn.css("display", "inline-block");
  divIn.appendTo(div);
  divInLtl.appendTo(div);

  div.appendTo($(document.body));
  $(document.body).css("border-top", "34px solid black");
  $(document.body).css("background-position-y", "34px");

  //console.log("BARVIS : " + barVis);
  if (barVis === 0) {
    $("#AMRBar").css("text-align", "left");
    $("#AMRBarIn").hide();
    //console.log("Cas 1");
  } else {
    $("#AMRBar").css("text-align", "center");
    $("#AMRBarInLtl").hide();
    //console.log("Cas 2");
  }
  return divContent;
}

function showDialog(dialog) {
  "use strict";
  var textDesc;
  if ($("#bookmarkData").data("type") === "chapter") {
    textDesc = "Bookmark chapter '" + $("#bookmarkData").data("chapName") + "' of '" + $("#bookmarkData").data("name") + "' on '" + $("#bookmarkData").data("mirror");
    textDesc += "'. You can add notes below which will be associated with this bookmark.";
  } else {
    textDesc = "Bookmark scan '" + $("#bookmarkData").data("scanName") + "' of chapter '" + $("#bookmarkData").data("chapName") + "' of '" + $("#bookmarkData").data("name") + "' on '" + $("#bookmarkData").data("mirror");
    textDesc += "'. You can add notes below which will be associated with this bookmark.";
  }
  $("#bookmarkPop #descEltAMR").text(textDesc);
}
//Used to request background page action
function sendExtRequest(request, button, callback, backsrc) {
  "use strict";
  //Prevent a second request
  if (button.data("currentlyClicked")) {
    return;
  }
  button.data("currentlyClicked", true);

  //Display a loading image
  var ancSrc;
  if (button.is("img")) {
    ancSrc = button.attr("src");
    button.attr("src", chrome.extension.getURL("img/load16.gif"));
  } else {
    if (button.is(".button")) {
      ancSrc = $("<img src='" + chrome.extension.getURL("img/ltload.gif") + "'></img>");
      ancSrc.appendTo(button);
    }
    if (button.is(".category") || button.is(".mgcategory")) {
      ancSrc = $("<img src='" + chrome.extension.getURL("img/load10.gif") + "'></img>");
      ancSrc.appendTo(button);
    }
  }
  //Call the action
  chrome.extension.sendRequest(request, function () {
    //setTimeout(function() {
    //Do the callback
    callback();
    //Removes the loading image
    if (button.is("img")) {
      if (backsrc) {
        button.attr("src", ancSrc);
      }
    } else {
      if (button.is(".button") || button.is(".category") || button.is(".mgcategory")) {
        ancSrc.remove();
      }
    }
    //Restore request
    button.removeData("currentlyClicked");
    //}, 1000);
  });
}

function isLandscape(img) {
  "use strict";
  if ($(img).data("canvasId")) {
    var can = $("#" + $(img).data("canvasId"));
    // console.log("landscape : " + can.width() + " --> " + can.height());
    return (can.width() > can.height());
  }
  // console.log("problems...");
  // Added radix parameter for parseInt, so JS always assume is a decimal.
  if (parseInt($(img).css("width"), 10) > parseInt($(img).css("height"), 10)) {
    return true;
  }
  return false;
}

function transformImagesInBook(where, mode, res) {
  "use strict";
  //mode = 1 --> images are displayed on top of one another
  //mode = 2 --> images are displayed two by two occidental reading mode
  //mode = 3 --> images are displayed two by two japanese reading mode
  var td = $("<td></td>"),
    tr = $("<tr></tr>"),
    tableRes = $("<table class='AMRtable'></table>"),
    isFirstDouble = true,
    isEven = true,
    evenImg = null,
    nbSinglePages = 0,
    posImg = [],
    nba,
    nbb,
    divMode,
    i;
  //console.log("Transformation book : State the images" + $(".imageAMR", where).size());
  $(".imageAMR", where).sort(function (a, b) {
    nba = $(a).closest(".spanForImg").data("order");
    nbb = $(b).closest(".spanForImg").data("order");
    return ((nba < nbb) ? -1 : ((nba === nbb) ? 0 : 1));
  }).each(function (index) {
    //console.log("setting image position...");
    if (isLandscape(this) || getMangaMirror().isImageInOneCol(this, document, window.location.href)) {
      posImg[index] = 2;
      if (isLandscape(this) && isFirstDouble) {
        if (index !== 0 && posImg[index - 1] !== 1) {
          for (i = 0; i < posImg.length; i += 1) {
            if (posImg[i] !== 2) {
              posImg[i] = (posImg[i] + 1) % 2;
            }
          }
        }
        isFirstDouble = false;
      }
      isEven = true;
    } else {
      if (index === $(".imageAMR", where).size() - 1 && isEven) {
        posImg[index] = 2;
      } else {
        posImg[index] = isEven ? 0 : 1;
        isEven = !isEven;
      }
    }
  });

  $(where).css("text-align", "center");

  tableRes.css("width", "100%");
  tableRes.css("position", "static");

  $(".spanForImg", where).sort(function (a, b) {
    nba = $(a).data("order");
    nbb = $(b).data("order");
    return ((nba < nbb) ? -1 : ((nba === nbb) ? 0 : 1));
  }).each(function (index) {
    divMode = ($("div > img", this).data("canvasId"));
    //if (divMode) console.log("DIV MODE");
    //if (!divMode) console.log("NOT DIV MODE");

    //console.log("displaying image position...");

    if (!divMode) {
      //$("img:first-child", this).css("margin-right", "10px");
      if ($("img:first-child", this).attr("src") !== chrome.extension.getURL("img/imgerror.png")) {
        $("img:first-child", this).css("margin-bottom", "50px");
        //$("img:first-child", this).css("border", "10px solid white");
        td.css("vertical-align", "middle");
      }
    }
    $(this).appendTo(td);

    //console.log("Displaying " + $("img:first-child", this).data("urlToLoad") + " in the table");

    if (posImg[index] === 2 || mode === 1) {
    // Before we declared "evenImg" as null, and only later we change
    // it to "td" only if (posImg[index] === 0). Can anyone explain this?
      if (evenImg !== null) {
        var trForEven = $("<tr></tr>");
        trForEven.appendTo(tableRes);
        evenImg.appendTo(trForEven);
        evenImg.attr("colspan", "2");
        evenImg = null;
        if (res.resize === 1) {
          if (!divMode) {
            $("img", trForEven).css("max-width", (screen.width - 200) + 'px');
          }
        }
      }
      tr.appendTo(tableRes);
      td.attr("colspan", "2");
      td.appendTo(tr);
      if (res.resize === 1) {
        if (!divMode) {
          $("img", tr).css("max-width", (screen.width - 200) + 'px');
        }
      }
    } else {
      if (evenImg !== null) {
        tr = $("<tr></tr>");
        tr.appendTo(tableRes);
        if (mode === 2) {
          evenImg.appendTo(tr);
          evenImg.css("text-align", "right");
          td.appendTo(tr);
          td.css("text-align", "left");
        } else {
          td.appendTo(tr);
          td.css("text-align", "right");
          evenImg.appendTo(tr);
          evenImg.css("text-align", "left");
        }
        if (res.resize === 1) {
          if (!divMode) {
            $("img", tr).css("max-width", ((screen.width - 200) / 2) + 'px');
          }
        }
        evenImg = null;
      } else {
        if (posImg[index] === 0) {
          evenImg = td;
        } else {
          tr = $("<tr></tr>");
          tr.appendTo(tableRes);
          td.attr("colspan", "2");
          td.appendTo(tr);
          if (res.resize === 1) {
            if (!divMode) {
              $("img", tr).css("max-width", ((screen.width - 200) / 2) + 'px');
            }
          }
        }
      }

    }
  });

  if (!divMode) {
    td = $("<td></td>");
    $("img:first-child", this).css("margin-bottom", "50px");
    $("img:first-child", this).css("margin-right", "10px");
    //$("img:first-child", this).css("border", "10px solid white");
    $("img:first-child", this).appendTo(td);
  }
  if (evenImg !== null) {
    tr = $("<tr></tr>");
    tr.appendTo(tableRes);
    if (mode === 2) {
      evenImg.appendTo(tr);
      evenImg.css("text-align", "right");
      td.appendTo(tr);
      td.css("text-align", "left");
    } else {
      td.appendTo(tr);
      td.css("text-align", "right");
      evenImg.appendTo(tr);
      evenImg.css("text-align", "left");
    }
    if (res.resize === 1) {
      if (!divMode) {
        $("img", tr).css("max-width", ((screen.width - 200) / 2) + 'px');
      }
    }
    evenImg = null;
  }

  $("table", where).remove();
  tableRes.appendTo(where);
}

function addTrailingLastChap(where) {
  "use strict";
  if ($("#nChapBtn0").size() === 0) {
    $("<div style=\"width:100%; background-color:white; border-radius:5px;margin-top:15px;margin-bottom:15px;\"><img src=\"" + chrome.extension.getURL("img/warn.png") + "\" style=\"vertical-align:middle;margin-right:10px;\"/><span style=\"font-weight:bold;font-size:12pt;color:black;vertical-align:middle;\">This is the latest published chapter !</span></div>").appendTo(where);
  }
}

function writeNavigation(where, select, res, params) {
  "use strict";
  var div = $("<div id='bookmarkPop' style='display:none'></div>"),
    btn = $("<a id='saveBtnAMR' class='buttonAMR'>Save</a>"),
    btndel = $("<a id='delBtnAMR' class='buttonAMR'>Delete Bookmark</a>"),
    divTip = $("<div id='tipBMAMR'></div>"),
    aBMPage = $("<a href='#'>AMR Bookmark Page</a>");

  $("<h3>Bookmark</h3>").appendTo(div);
  $("<div id='descEltAMR'></div>").appendTo(div);
  $("<table><tr><td style='vertical-align:top'><b>Note:</b></td><td><textarea id='noteAMR' cols='50' rows='5' /></td></tr></table>").appendTo(div);
  btn.click(function () {
    var obj = {
        action : "addUpdateBookmark",
        mirror : $("#bookmarkData").data("mirror"),
        url : $("#bookmarkData").data("url"),
        chapUrl : $("#bookmarkData").data("chapUrl"),
        type : $("#bookmarkData").data("type"),
        name : $("#bookmarkData").data("name"),
        chapName : $("#bookmarkData").data("chapName")
      },
      imgScan = $(".spanForImg img[src='" + $("#bookmarkData").data("scanUrl") + "']");
    if ($("#bookmarkData").data("type") !== "chapter") {
      obj.scanUrl = $("#bookmarkData").data("scanUrl");
      obj.scanName = $("#bookmarkData").data("scanName");
    }
    obj.note = $("#noteAMR").val();
    // This must be checked the 
    if ($("#bookmarkData").data("type") !== "chapter") {
      imgScan.css("border-color", "#999999");
    // This was a ternary operator?
      // if ($("#noteAMR").val() !== "")  imgScan.attr("title", "Note : " + $("#noteAMR").val());
      if ($("#noteAMR").val() !== "") { imgScan.attr("title", "Note : " + $("#noteAMR").val()); }
      imgScan.data("note", $("#noteAMR").val());
      imgScan.data("booked", true);
    } else {
      $("#bookmarkData").data("note", $("#noteAMR").val());
      // Another?
      if ($("#noteAMR").val() !== "") { $(".bookAMR").attr("title", "Note : " + $("#noteAMR").val()); }
      $(".bookAMR").attr("src", chrome.extension.getURL("img/bookmarkred.png"));
      $("#bookmarkData").data("chapbooked", true);
    }

    chrome.extension.sendRequest(obj, function (resp) {});
    $.modal.close();
  });

  btndel.click(function () {
    var obj = {
      action : "deleteBookmark",
      mirror : $("#bookmarkData").data("mirror"),
      url : $("#bookmarkData").data("url"),
      chapUrl : $("#bookmarkData").data("chapUrl"),
      type : $("#bookmarkData").data("type")
    },
      imgScan = $(".spanForImg img[src='" + $("#bookmarkData").data("scanUrl") + "']");
    if ($("#bookmarkData").data("type") !== "chapter") {
      obj.scanUrl = $("#bookmarkData").data("scanUrl");
    }

    if ($("#bookmarkData").data("type") !== "chapter") {
      imgScan.css("border-color", "white");
      imgScan.removeAttr("title");
      imgScan.removeData("booked");
    } else {
      $(".bookAMR").removeAttr("title");
      $(".bookAMR").attr("src", chrome.extension.getURL("img/bookmark.png"));
      $("#bookmarkData").removeData("chapbooked");
    }

    chrome.extension.sendRequest(obj, function (resp) {});
    $.modal.close();
  });
  btndel.appendTo(div);
  btn.appendTo(div);

  $("<span>To bookmark a scan, right click on it and choose 'Bookmark in AMR'.</span><br /><span>To manage bookmarks, go to </span>").appendTo(divTip);

  aBMPage.click(function () {
    chrome.extension.sendRequest({
      action : "opentab",
      url : "/bookmarks.html"
    }, function (resp) {});
  });
  aBMPage.appendTo(divTip);
  divTip.appendTo(div);
  div.appendTo($(document.body));

  where.empty();
  where.each(function (index) {
    var objBM = {
        action : "getBookmarkNote",
        mirror : getMangaMirror().mirrorName,
        url : res.currentMangaURL,
        chapUrl : res.currentChapterURL,
        type : "chapter"
      },
      book = $("<img class='bookAMR' src='" + chrome.extension.getURL("img/bookmark.png") + "'/>"),
      myself = this,
      aprev,
      anext,
      nextUrl,
      prevUrl,
      selectIns;

    selectIns = $(select).clone();
    $(selectIns).css("float", "none");
    selectIns.attr("value", $(select).children("option:selected").val());

    selectIns.change(function () {
      window.location.href = $("option:selected", $(this)).val();
    });
    prevUrl = getMangaMirror().previousChapterUrl(selectIns, document, window.location.href);
    if (prevUrl !== null) {
      aprev = $("<a id='pChapBtn" + index + "' class='buttonAMR' href='" + prevUrl + "'>Previous</a>");
      aprev.appendTo(this);
    }
    selectIns.appendTo(this);
    nextUrl = getMangaMirror().nextChapterUrl(selectIns, document, window.location.href);
    if (nextUrl !== null) {
      anext = $("<a id='nChapBtn" + index + "' class='buttonAMR' href='" + nextUrl + "'>Next</a>");
      anext.appendTo(this);
      jQuery.data(document.body, "nexturltoload", nextUrl);
    }

    //Add bookmark functionality
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
        focus : false,
        onShow : showDialog,
        zIndex : 10000000
      });

      /* $("#noteAMR").keydown(function(event) {
      if(event.which === 110 || event.which===188 || event.which===190){
      //console.log(event.which);
      //event.preventDefault();
      //event.stopPropagation();
      }
      });*/
    });
    if (index === 0) {
      chrome.extension.sendRequest(objBM, function (result) {
        if (!result.isBooked) {
          $("#bookmarkData").data("note", "");
          $(".bookAMR").attr("title", "Click here to bookmark this chapter");
        } else {
          $("#bookmarkData").data("note", result.note);
          if (result.note !== "") {
            $(".bookAMR").attr("title", "Note : " + result.note);
          }
          $("#bookmarkData").data("chapbooked", true);
          $(".bookAMR").attr("src", chrome.extension.getURL("img/bookmarkred.png"));
        }
      });
    }

    //Get specific read for currentManga
    chrome.extension.sendRequest({
      action : "mangaInfos",
      url : res.currentMangaURL
    }, function (resp) {
      var isRead = (resp === null ? false : (resp.read === 1)),
        imgread = $("<img class='butamrread' src='" + chrome.extension.getURL("img/" + (!isRead ? "read_stop.png" : "read_play.png")) + "' title='" + (!isRead ? "Stop following updates for this manga" : "Follow updates for this manga") + "' />"),
      //Get specific mode for currentManga
        curmode = -1,
        imgmode,
        imgstop,
        whereNavToTrail,
        imgadd,
        deletePub,
        linkP2,
        linkPub;
      if (resp === null && params.addauto === 0) {
        imgread.hide();
      }
      imgread.appendTo(myself);
      imgread.data("mangaurl", res.currentMangaURL);

      imgread.click(function () {
        var curRead = ($(this).attr("src") === chrome.extension.getURL("img/read_play.png")),
          obj = {
            action : "markReadTop",
            url : $(this).data("mangaurl"),
            read : (curRead ? 0 : 1),
            updatesamemangas : true
          },
          butnot = this;
        sendExtRequest(obj, $(this), function () {
          if (curRead) {
            $(butnot).attr("src", chrome.extension.getURL("img/read_stop.png"));
            $(butnot).attr("title", "Stop following updates for this manga");
          } else {
            $(butnot).attr("src", chrome.extension.getURL("img/read_play.png"));
            $(butnot).attr("title", "Follow updates for this manga");
          }
        }, false);
      });

      if (resp !== null && resp.display) {
        curmode = resp.display;
      }
      //If not use res.mode
      if (curmode === -1) {
        curmode = params.displayMode;
      }
      //mode = 1 --> images are displayed on top of one another
      //mode = 2 --> images are displayed two by two occidental reading mode
      //mode = 3 --> images are displayed two by two japanese reading mode
      imgmode = $("<img src='" + chrome.extension.getURL("img/" + ((curmode === 1) ? "ontop.png" : ((curmode === 2) ? "righttoleft.png" : "lefttoright.png"))) + "' title='" + ((curmode === 1) ? "Scans displayed on top of each other (click to switch display mode for this manga only)" : ((curmode === 2) ? "Scans displayed as a book in occidental mode (left to right) (click to switch display mode for this manga only)" : "Scans displayed as a book in japanese mode (right to left) (click to switch display mode for this manga only)")) + "' />");
      imgmode.appendTo(myself);
      imgmode.data("curmode", curmode);
      imgmode.data("mangaurl", res.currentMangaURL);
      imgmode.click(function () {
        var md = $(this).data("curmode"),
          mdnext = (md % 3) + 1,
          obj = {
            action : "setDisplayMode",
            url : $(this).data("mangaurl"),
            display : mdnext
          },
          butnotMode = this;
        sendExtRequest(obj, $(this), function () {
          $(butnotMode).data("curmode", mdnext);
          transformImagesInBook(amrWhereScans, mdnext, $(document.body).data("amrparameters"));
          if (mdnext === 1) {
            $(butnotMode).attr("src", chrome.extension.getURL("img/ontop.png"));
            $(butnotMode).attr("title", "Scans displayed on top of each other (click to switch display mode for this manga only)");
          } else if (mdnext === 2) {
            $(butnotMode).attr("src", chrome.extension.getURL("img/righttoleft.png"));
            $(butnotMode).attr("title", "Scans displayed as a book in occidental mode (left to right) (click to switch display mode for this manga only)");
          } else {
            $(butnotMode).attr("src", chrome.extension.getURL("img/lefttoright.png"));
            $(butnotMode).attr("title", "Scans displayed as a book in japanese mode (right to left) (click to switch display mode for this manga only)");
          }
        }, false);
      });

      imgstop = $("<img class='butamrstop' src='" + chrome.extension.getURL("img/stop.gif") + "' title='Mark this chapter as latest chapter read' />");
      if (resp === null && params.addauto === 0) {
        imgstop.hide();
      }
      imgstop.appendTo(myself);
      imgstop.data("mangainfo", res);

      imgstop.click(function () {
      // TODO: Don't use alert dialog boxes.
        var ret = confirm("This action will reset your reading state for this manga and this chapter will be considered as the latest you have read. Do you confirm this action ?"),
          obj;
        if (ret) {
          obj = {
            "action" : "setMangaChapter",
            "url" : $(this).data("mangainfo").currentMangaURL,
            "mirror" : getMangaMirror().mirrorName,
            "lastChapterReadName" : $(this).data("mangainfo").currentChapter,
            "lastChapterReadURL" : $(this).data("mangainfo").currentChapterURL,
            "name" : $(this).data("mangainfo").name
          };
          sendExtRequest(obj, $(this), function () {}, true);
        }
      });

      if (params.addauto === 0 && resp === null) {
        imgadd = $("<img src='" + chrome.extension.getURL("img/add.png") + "' title='Add this manga to your reading list' />");
        imgadd.appendTo(myself);
        imgadd.data("mangainfo", res);

        imgadd.click(function () {
          var obj = {
            "action" : "readManga",
            "url" : $(this).data("mangainfo").currentMangaURL,
            "mirror" : getMangaMirror().mirrorName,
            "lastChapterReadName" : $(this).data("mangainfo").currentChapter,
            "lastChapterReadURL" : $(this).data("mangainfo").currentChapterURL,
            "name" : $(this).data("mangainfo").name
          },
            butnotadd = this;
          sendExtRequest(obj, $(this), function () {
            $(".butamrstop").show();
            $(".butamrread").show();
            $(butnotadd).remove();
          }, true);
        });
      }

      $(myself).addClass("amrbarlayout");
      /*
      var down=$("<a id='downButAMR' class='buttonAMR' href='#'>Download</a>");
      down.click(function() {
      download();
      return false;
      });

      down.appendTo(this);
       */

      //TODO : change pub !!! (facebook + donate)...
      if (params.pub === 1) {
        linkPub = $("<div class=\"titleAMRPub\"></div>");
        linkP2 = $("<span>You like reading your mangas this way with All Mangas Reader Extension, please donate !!&nbsp;&nbsp;</span><form action=\"https://www.paypal.com/cgi-bin/webscr\" method=\"post\" style='display:inline-block;'><input type=\"hidden\" name=\"cmd\" value=\"_s-xclick\"><input type=\"hidden\" name=\"hostedbutnotton_id\" value=\"7GQN3EZ6KK5MU\"><input type=\"image\" src=\"https://www.paypalobjects.com/WEBSCR-640-20110429-1/en_US/i/btn/btn_donate_SM.gif\" border=\"0\" name=\"submit\" alt=\"PayPal - The safer, easier way to pay online!\"><img alt=\"\" border=\"0\" src=\"https://www.paypalobjects.com/WEBSCR-640-20110429-1/en_US/i/scr/pixel.gif\" width=\"1\" height=\"1\"></form>");
        deletePub = $("<img src=\"" + chrome.extension.getURL("img/cancel.png") + "\" />");
        linkP2.css("vertical-align", "middle");
        linkP2.css("color", "red!important");
        /*linkP2.click(function() {
        chrome.extension.sendRequest({action: "openExtensionMainPage"}, function(response) {});
        });*/
        linkP2.appendTo(linkPub);
        deletePub.attr("title", "Remove this banner...");
        deletePub.css("cursor", "pointer");
        deletePub.css("vertical-align", "middle");
        deletePub.css("margin-left", "10px");
        deletePub.click(function () {
          chrome.extension.sendRequest({
            action : "deletepub"
          }, function (response) {
            $(".titleAMRPub").remove();
          });
        });
        deletePub.appendTo(linkPub);
        linkPub.appendTo(myself);
      }
      whereNavToTrail = getMangaMirror().whereDoIWriteNavigation(document, window.location.href);
      addTrailingLastChap($(whereNavToTrail).last());
    });
  });
}
function updateStat(estimated) {
  "use strict";
  var tosend = timespent,
    statobj = {
      "action" : "updateMgForStat",
      "id" : idStat,
      "time_spent" : tosend
    };
  estimated = estimated || false;
  if (estimated) {
    if (isActive) {
      tosend += new Date().getTime() - starttime;
    }
  }
  if (sendStats) {
    chrome.extension.sendRequest(statobj, function (response) {});
  }
  setTimeout(updateStat, updatetime);
}


function bindCalculateTime() {
  "use strict";
  window.onbeforeunload = function () {
    var now = new Date().getTime(),
      res = "",
      i;
    if (isActive) {
      if (debugTimes) {
        times[times.length] = now - starttime;
      }
      timespent += now - starttime;
      starttime = now;
    }
    updateStat();
    if (debugTimes) {
      for (i = 0; i < times.length; i += 1) {
        res += times[i] + ", ";
      }
      res += " --> " + timespent;
      return res;
    }
  };
  $(window).focus(function () {
    starttime = new Date().getTime();
    isActive = true;
  });
  $(window).blur(function () {
    var now = new Date().getTime();
    if (debugTimes) {
      times[times.length] = now - starttime;
    }
    timespent += now - starttime;
    starttime = now;

    isActive = false;
  });

}

function onLoadImage() {
  "use strict";
  var objBM,
    width,
    height,
    ancCan = $("#" + $(this).data("canvasId")),
    resize = $(this).data("resize"),
    mode = $(this).data("modedisplay");
  if ($(this).data("canvasId")) {
    if (resize === 1) {
      if (ancCan.width() < ancCan.height()) {
        if (mode !== 1) {
          if (ancCan.width() > (screen.width - 200) / 2) {
            width = (screen.width - 200) / 2;
          } else {
            width = ancCan.width();
          }
        } else {
          if (ancCan.width() > (screen.width - 200)) {
            width = (screen.width - 200);
          } else {
            width = ancCan.width();
          }
        }
      } else {
        if (ancCan.width() > (screen.width - 200)) {
          width = (screen.width - 200);
        } else {
          width = ancCan.width();
        }
      }
    } else {
      width = ancCan.width();
    }
    height = (width / ancCan.width()) * ancCan.height();
    //console.log($(this).data("canvasId") + " --> (" + ancCan.width() + "; " + ancCan.height() + ") --> (" + width + "; " + height + ")");
    /*
    //CANVAS VERSION
    var canvasCpy = $("<canvas width='" + width + "px' height='" + height + "px'/>");
    $(this).after(canvasCpy);
    var copyContext = canvasCpy[0].getContext("2d");
    copyContext.drawImage(ancCan[0], 0, 0, ancCan.width(), ancCan.height() , 0, 0, width, height);
    ancCan.remove();
    canvasCpy.attr("id", $(this).data("canvasId"));
    $("#" + $(this).data("divLoad")).css("display", "none");
    $(this).data("finish", "1");
    $(this).css("display", "none");
    canvasCpy.css("margin-bottom", "50px");
     */

    //DIV VERSION
    $("div", ancCan).add($("div > img", ancCan)).each(function (index) {
      var wori,
        hori,
        w,
        h,
        l,
        t;

      //FIX CONFLICT WITH AdBlock -->
      wori = $(this).width();
      if (wori === 0) {
        //console.log("zero width img to " + $(this).data("width"));
        wori = $(this).data("width");
      }
      hori = $(this).height();
      if (hori === 0) {
        //console.log("zero height img to " + $(this).data("height"));
        hori = $(this).data("height");
      }
      //---
      w = Math.floor((width / ancCan.width()) * wori) + 1;
      h = Math.floor((width / ancCan.width()) * hori) + 1;

      $(this).css("width", w + 'px');
      $(this).css("height", h + 'px');
      if ($(this).css("position") === "absolute") {
        l = Math.floor((width / ancCan.width()) * $(this).position().left);
        if (l !== 0) {
          l += 1;
        }
        t = Math.floor((width / ancCan.width()) * $(this).position().top);
        if (t !== 0) {
          t += 1;
        }
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
    if ($(this).attr("src") !== chrome.extension.getURL("img/imgerror.png")) {
      $(this).css("border", "5px solid white");
      $(this).css("margin-bottom", "50px");
    }

    //Create contextual menu to bookmark image
    chrome.extension.sendRequest({
      action : "createContextMenu",
      lstUrls : [$(this).attr("src")]
    }, function (resp) {});
    //Check bookmarks
    objBM = {
      action : "getBookmarkNote",
      mirror : $("#bookmarkData").data("mirror"),
      url : $("#bookmarkData").data("url"),
      chapUrl : $("#bookmarkData").data("chapUrl"),
      type : "scan",
      scanUrl : $(this).attr("src"),
      scanName : $(this).data("idScan")
    };
    chrome.extension.sendRequest(objBM, function (result) {
      if (result.isBooked) {
        var imgScan = $(".spanForImg img[src='" + result.scanSrc + "']");
        if (imgScan.size() === 0) {
          imgScan = $(".spanForImg img[src='" + decodeURI(result.scanSrc) + "']");
        }
        imgScan.data("note", result.note);
        imgScan.data("booked", 1);
        if (result.note !== "") {
          imgScan.attr("title", "Note : " + result.note);
        }
        imgScan.css("border-color", "#999999");
      }
    });

    if (autoBookmarkScans) {
      $(this).dblclick(function () {
        var obj;
        if ($(this).data("booked")) {
          obj = {
            action : "deleteBookmark",
            mirror : $("#bookmarkData").data("mirror"),
            url : $("#bookmarkData").data("url"),
            chapUrl : $("#bookmarkData").data("chapUrl"),
            type : "scan"
          };
          obj.scanUrl = $(this).attr("src");

          $(this).css("border-top-color", "white");
          $(this).css("border-right-color", "white");
          $(this).css("border-bottom-color", "white");
          $(this).css("border-left-color", "white");
          $(this).removeAttr("title");
          $(this).removeData("booked");
          $(this).removeData("note");

          chrome.extension.sendRequest(obj, function (resp) {});
        } else {
          obj = {
            action : "addUpdateBookmark",
            mirror : $("#bookmarkData").data("mirror"),
            url : $("#bookmarkData").data("url"),
            chapUrl : $("#bookmarkData").data("chapUrl"),
            type : "scan",
            name : $("#bookmarkData").data("name"),
            chapName : $("#bookmarkData").data("chapName")
          };
          obj.scanUrl = $(this).attr("src");
          obj.scanName = $(this).data("scanName");
          obj.note = "";

          $(this).css("border-color", "#999999");
          $(this).data("note", "");
          $(this).data("booked", 1);

          chrome.extension.sendRequest(obj, function (resp) {});
        }
      });
    }
  }
  /*
  $("#" + $(this).data("divLoad")).css("display", "none");
  $(this).data("finish", "1");
  $(this).css("margin-right", "10px");
  if ($(this).attr("src") !== chrome.extension.getURL("img/imgerror.png")) {
  $(this).css("border", "10px solid white");
  $(this).css("margin-bottom", "50px");
   */

  //}
}

function onErrorImage() {
  "use strict";
  var imgSave = new Image(),
    butReco = $("<a class='buttonAMR'>Try to reload</a>");
  $(this).css("margin-bottom", "50px");
  $(this).css("margin-right", "10px");
  if (this.naturalWidth === 0) {
    //Here, number of tries before considering image can not be loaded
    if ($(this).data("number") === 2) {
      console.log("Image has not been recovered");
      $(this).attr("src", chrome.extension.getURL("img/imgerror.png"));
      $(this).css("border", "0");
      $(this).css("margin", "0");
      $(this).data("finish", "1");
      $("#" + $(this).data("divLoad")).css("display", "none");

      //Create the reload button
      butReco.css("display", "block");
      butReco.css("max-width", "200px");
      butReco.css("margin-left", "auto");
      butReco.css("margin-right", "auto");
      $(this).after(butReco);
      butReco.click(function () {
        var imgAnc = $(this).prev(),
          url = $(imgAnc).data("urlToLoad"),
          divLoadId = $(imgAnc).data("divLoad"),
          div = $("<div id=\"" + divLoadId + "\" class=\"divLoading\"></div>"),
          idScan = $(imgAnc).data("idScan"),
          spanner = $(this).parent(),
          img = new Image();
        spanner.empty();

        //=== loadImage
        $(img).data("urlToLoad", url);
        $(img).css("border", "5px solid white");
        $(img).load(onLoadImage);
        $(img).error(onErrorImage);
        getMangaMirror().getImageFromPageAndWrite(url, img, document, window.location.href);

        $(img).appendTo(spanner);

        div.css("background", "url(" + chrome.extension.getURL("img/loading.gif") + ") no-repeat center center");
        $(img).data("divLoad", divLoadId);
        $(img).data("idScan", idScan);
        div.appendTo(spanner);
      });

    } else {
      //console.log("An image has encountered a problem while loading... All Mangas Reader is trying to recover it...");
      if ($(this).data("hasErrors") !== "1") {
        $(imgSave).data("hasErrors", "1");
        $(imgSave).data("number", 1);
      } else {
        $(imgSave).data("hasErrors", "1");
        $(imgSave).data("number", $(this).data("number") + 1);
      }

      $(imgSave).data("divLoad", $(this).data("divLoad"));
      $(imgSave).data("idScan", $(this).data("idScan"));

      //=== loadImage
      $(imgSave).data("urlToLoad", $(this).data("urlToLoad"));
      $(imgSave).css("border", "5px solid white");
      $(imgSave).load(onLoadImage);
      $(imgSave).error(onErrorImage);
      getMangaMirror().getImageFromPageAndWrite($(this).data("urlToLoad"), imgSave, document, window.location.href);

      $(this).after($(imgSave));
      $(this).remove();
    }
  } else {
    $("#" + $(this).data("divLoad")).css("display", "none");
    $(this).data("finish", "1");
    $(this).data("error", "1");
  }
}

function nbLoaded(where) {
  "use strict";
  var nbOk = 0;
  $(".imageAMR", where).each(function (index) {
    if ($(this).data("finish") === "1") {
      nbOk += 1;
    }
  });
  return nbOk;
}

function loadImageAMR(where, url, img, pos, res, mode, second) {
  "use strict";
  if (!second) {
    $(img).data("urlToLoad", url);
    $(img).data("resize", res.resize);
    $(img).data("modedisplay", mode);

    $(img).load(onLoadImage);
    $(img).error(onErrorImage);
  }

  if (res.imgorder === 1) {
    if (nbLoaded(where) === pos) {
      getMangaMirror().getImageFromPageAndWrite(url, img, document, window.location.href);
    } else {
      setTimeout(function () {
        loadImageAMR(where, url, img, pos, res, mode, true);
      }, 100);
    }
  } else {
    getMangaMirror().getImageFromPageAndWrite(url, img, document, window.location.href);
  }
}

function onLoadNextImage() {
  "use strict";
  var lstbtn = [],
    id = "nChapBtn",
    myself = this,
    i = 0;
  while ($("#" + id + i).size() > 0) {
    lstbtn[lstbtn.length] = $("#" + id + i);
    i += 1;
  }
  $.each(lstbtn, function (index) {
    if ($(this).data("nbloaded")) {
      $(this).data("nbloaded", $(this).data("nbloaded") + 1);
    } else {
      $(this).data("nbloaded", 1);
    }
    var prog;
    if ($(".progress", $(this)).size() === 0) {
      prog = $("<span class='buttonAMR progress'></span>");
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
      prog = $(".progress", $(this));
    }
    //console.log((this[0].offsetWidth * ($(this).data("nbloaded") / $(myself).data("total"))) + " --> " + $(this).data("nbloaded") + " ; " + $(myself).data("total"));
    prog.css("width", (this[0].offsetWidth * ($(this).data("nbloaded") / $(myself).data("total"))) + "px");
  });
}

function onErrorNextImage() {
  "use strict";
  // TODO: retry...
}

function loadNextChapter(urlNext) {
  "use strict";
  // load an iframe with urlNext and get list of images
  chrome.extension.sendRequest({
    action : "getNextChapterImages",
    url : urlNext,
    mirrorName : getMangaMirror().mirrorName
  }, function (resp) {
    var lst = resp.images,
      img = new Image(),
      i;
    if (lst !== null) {
      for (i = 0; i < lst.length; i += 1) {
        $(img).data("attempts", 0);
        $(img).data("id", i);
        $(img).data("urltoload", lst[i]);
        $(img).data("urlnext", urlNext);
        $(img).data("total", lst.length);
        $(img).load(onLoadNextImage);
        $(img).error(onErrorNextImage);
        getMangaMirror().getImageFromPageAndWrite(lst[i], img, document, urlNext);
      }
    }
  });
}

function waitForImages(where, mode, res, title) {
  "use strict";
  var isOk = true,
    nbOk = 0,
    nbTot = 0;
  $(".imageAMR", where).each(function (index) {
    if ($(this).data("finish") !== "1") {
      isOk = false;
    } else {
      nbOk += 1;
    }
    if (this.offsetWidth !== $(this).data("owidth")) {
      $("#" + $(this).data("divLoad")).css("display", "none");
    }
    nbTot += 1;
  });
  if (res.load === 1) {
    if (nbTot !== 0) {
      $("title").text(Math.floor(nbOk / nbTot * 100) + " % - " + title);
    }
  }
  if (isOk) {
    //console.log("finish loading images");
    transformImagesInBook(where, mode, res);
    getMangaMirror().doAfterMangaLoaded(document, window.location.href);
    $("title").text(title);
    if (jQuery.data(document.body, "nexturltoload") && prefetchChapter) {
      loadNextChapter(jQuery.data(document.body, "nexturltoload"));
    }

    if (jQuery.data(document.body, "sendwhendownloaded")) {
      chrome.extension.sendRequest(jQuery.data(document.body, "sendwhendownloaded"), function (response) {});
    }

  } else {
    setTimeout(function () {
      waitForImages(where, mode, res, title);
    }, 500);
  }
}

function writeImages(where, list, mode, res) {
  "use strict";
  var table = $("<table class='AMRtable'></table>"),
    spanner = $("<div class=\"spanForImg\"></div>"),
    tr = $("<tr></tr>"),
    td = $("<td></td>"),
    title = $("title").text(),
    img = new Image(),
    div,
    i;
  table.css("text-align", "center");
  table.css("position", "static");
  table.css("width", "100%");
  table.appendTo(where);

  for (i = 0; i < list.length; i += 1) {
    tr.appendTo(table);
    td.css("text-align", "center");
    td.appendTo(tr);

    $(spanner).css("vertical-align", "middle");
    $(spanner).css("text-align", "center");
    $(spanner).data("order", i);
    spanner.appendTo(td);

    $(img).addClass("imageAMR");
    //$(img).attr("title", i+1);
    loadImageAMR(where, list[i], img, i, res, mode);
    $(img).appendTo(spanner);

    div = $("<div id=\"loader" + i + "\" class=\"divLoading\"></div>");
    div.css("background", "url(" + chrome.extension.getURL("img/loading.gif") + ") no-repeat center center");
    $(img).data("divLoad", "loader" + i);
    $(img).data("idScan", i);
    $(img).data("owidth", img.offsetWidth);
    div.appendTo(spanner);
  }
  waitForImages(where, mode, res, title);
}

function callbackListChaps(list, select) {
  "use strict";
  var hasSelected = false,
    optTmp,
    j;
  for (j = 0; j < list.length; j += 1) {
    if ($(select).data("mangaCurUrl").indexOf(list[j][1]) !==  -1 && !hasSelected) {
      optTmp = $("<option value=\"" + list[j][1] + "\">" + list[j][0] + "</option>");
      optTmp.attr("selected", true);
      if ($(select).data("mangaCurUrl") === list[j][1]) {
        hasSelected = true;
      }
    }
    optTmp.appendTo($(select));
  }

  chrome.extension.sendRequest({
    "action" : "parameters"
  }, function (response) {
    //console.log("loading chap");
    //getMangaMirror().getInformationsFromCurrentPage(document, window.location.href, function(res) {
    var whereNav;
    if (response.newbar === 1) {
      chrome.extension.sendRequest({
        action : "barState"
      }, function (barState) {
        whereNav = createBar(barState.barVis);
        writeNavigation(whereNav, select, jQuery.data(document.body, "curpageinformations"), response);
      });
    } else {
      whereNav = getMangaMirror().whereDoIWriteNavigation(document, window.location.href);
      writeNavigation(whereNav, select, jQuery.data(document.body, "curpageinformations"), response);
    }
    //console.log(jQuery.data(document.body, "curpageinformations"));
    //});
  });
}
function initPage() {
  //console.log("initPage");
  "use strict";
  if (getMangaMirror().isCurrentPageAChapterPage(document, window.location.href)) {
    setKeys();
    //console.log("found mirror for current page");
    chrome.extension.sendRequest({
      "action" : "parameters"
    }, function (response) {
      if (response.lrkeys === 1) {
        useLeftRightKeys = true;
      }
      if (response.autobm === 1) {
        autoBookmarkScans = true;
      }
      if (response.prefetch === 1) {
        prefetchChapter = true;
      }
      if (response.rightnext === 1) {
        nextRight = true;
      }
      if (response.sendstats === 1) {
        sendStats = true;
      }

      getMangaMirror().getInformationsFromCurrentPage(document, window.location.href, function (res) {
        jQuery.data(document.body, "curpageinformations", res);
        //console.log(res);
        //console.log(jQuery.data(document.body, "curpageinformations"));
        //console.log(res);
        chrome.extension.sendRequest({
          action : "mangaInfos",
          url : res.currentMangaURL
        }, function (resp) {
          chrome.extension.sendRequest({
            action : "barState"
          }, function (barState) {
            var obj,
              imagesUrl = getMangaMirror().getListImages(document, window.location.href),
              select = getMangaMirror().getMangaSelectFromPage(document, window.location.href),
              where = getMangaMirror().whereDoIWriteScans(document, window.location.href),
              selectIns = $("<select></select>"),
              isSel = true,
              curmode = -1,
              whereNav,
              statobj;
            createDataDiv(res);
            if (response.displayChapters === 1) {
              if (select === null) {
                selectIns.data("mangaCurUrl", res.currentChapterURL);
                getMangaMirror().getListChaps(res.currentMangaURL, res.name, selectIns, callbackListChaps);
                isSel = false;
              }
              getMangaMirror().doSomethingBeforeWritingScans(document, window.location.href);
              if (isSel) {
                if (response.newbar === 1) {
                  whereNav = createBar(barState.barVis);
                } else {
                  whereNav = getMangaMirror().whereDoIWriteNavigation(document, window.location.href);
                }

                writeNavigation(whereNav, select, res, response);
              }
              amrWhereScans = where;
              $(document.body).data("amrparameters", response);
              //Get specific mode for currentManga
              if (resp !== null && resp.display) {
                curmode = resp.display;
              }
              //If not use res.mode
              if (curmode === -1) {
                curmode = response.displayMode;
              }
              writeImages(where, imagesUrl, curmode, response);
            }
            if (response.markwhendownload === 0 && (response.addauto === 1 || resp !== null)) {
              obj = {
                "action" : "readManga",
                "url" : res.currentMangaURL,
                "mirror" : getMangaMirror().mirrorName,
                "lastChapterReadName" : res.currentChapter,
                "lastChapterReadURL" : res.currentChapterURL,
                "name" : res.name
              };
              chrome.extension.sendRequest(obj, function (response) {});
            } else {
              if (response.markwhendownload === 1 && (response.addauto === 1 || resp !== null)) {
                jQuery.data(document.body, "sendwhendownloaded", {
                  "action" : "readManga",
                  "url" : res.currentMangaURL,
                  "mirror" : getMangaMirror().mirrorName,
                  "lastChapterReadName" : res.currentChapter,
                  "lastChapterReadURL" : res.currentChapterURL,
                  "name" : res.name
                });
              }
            }
            if (sendStats) {
              statobj = {
                "action" : "readMgForStat",
                "url" : res.currentMangaURL,
                "mirror" : getMangaMirror().mirrorName,
                "lastChapterReadName" : res.currentChapter,
                "lastChapterReadURL" : res.currentChapterURL,
                "name" : res.name
              };
              chrome.extension.sendRequest(statobj, function (response) {
                idStat = response.id;
                bindCalculateTime();
                setTimeout(function () {
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

/*
var divNum = $("<div class='pagenumberAMR'><div class='number'>" + ($(this).data("idScan") + 1) + "</div></div>");
divNum.appendTo($(this).closest(".spanForImg"));
function download() {
var list = [];
$(".spanForImg img").each(function(index) {
list[list.length] = $(this).attr("src");
});

chrome.extension.sendRequest({action: "createZipFile", lst: list}, function(res) {
console.log("download");
//console.log(content);
var localServer = google.gears.factory.create('beta.localserver');
var blobBuilder = google.gears.factory.create('beta.blobbuilder');
var zipStore = localServer.openStore('amr');
if (zipStore === null){
zipStore = localServer.createStore('amr');
}
console.log("before append");
//blobBuilder.append(content);
//var cont = JSZipBase64.decode(content);
for (var c = 0; c < res.content.length; c++){
blobBuilder.append(res.content.charCodeAt(c));
}
//blobBuilder.append(res.content);
//blobBuilder.append(cont);
var now = new Date();
var zipUrl = 'AMR' + now.getTime() + '.zip';
//console.log(zipUrl);
zipStore.captureBlob(blobBuilder.getAsBlob(), zipUrl, 'application/zip');
//chrome.tabs.create({"url": zipUrl});
//console.log(zipUrl);
window.location.href=zipUrl;//"data:application/zip;base64,"+content;
});
}
 */

function clickOnBM(src) {
  "use strict";
  var imgScan = $(".spanForImg img[src='" + src + "']");
  if (imgScan.size() === 0) {
    imgScan = $(".spanForImg img[src='" + decodeURI(src) + "']");
  }

  /*imgScan.css("border-top-color", "#84b8d9");
  imgScan.css("border-right-color", "#84b8d9");
  imgScan.css("border-bottom-color", "#84b8d9");
  imgScan.css("border-left-color", "#84b8d9");*/

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

  $("#bookmarkPop").modal({
    focus : false,
    onShow : showDialog,
    zIndex : 10000000
  });

  /*$("#noteAMR").keydown(function(event) {
  if(event.which === 110 || event.which===188 || event.which===190){
  //event.preventDefault();
  //event.stopImmediatePropagation();
  }
  });*/
}

function zoomrest() {
  "use strict";
  $(".imageAMR").each(function (index) {
    if (this.style.zoom !== 0) {
      this.style.zoom *= 0;
    } else {
      this.style.zoom = 0;
    }
  });
}

function stopEventProp(e) {
  "use strict";
  e.stopPropagation();
}

chrome.extension.sendRequest({
  action : "pagematchurls",
  url : window.location.href
}, function (response) {
  "use strict";
  if (response.isOk) {
    removeBanner();
    initPage();
  }
});