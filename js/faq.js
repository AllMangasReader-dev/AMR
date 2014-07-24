function viewArticle(pathstr) {
  "use strict";
  var elt = $(".menu[rel='" + pathstr + "']"),
    path,
    i;
  $(".menu").removeClass("selected");
  $(elt).addClass("selected");
  $(".menu:first", $(elt).parents("li")).addClass("selected");
  $(".article").each(function (index) {
    var pathtmp = $(this).attr("id");
    $(this).parents(".article").each(function (index) {
      pathtmp = $(this).attr("id") + " " + pathtmp;
    });
    if (pathstr.indexOf(pathtmp) === -1) {
      $(this).hide();
    }
  });
  path = pathstr.split(" ");
  for (i = 0; i < path.length; i += 1) {
    if (!$("#" + path[i]).is(":visible")) {
      $("#" + path[i]).toggle("blind", {}, 250);
    }
    if (i === path.length - 1) {
      if (!$(".article", $("#" + path[i])).is(":visible")) {
        $(".article", $("#" + path[i])).toggle("blind", {}, 250);
      }
    }
  }
}
function nodeToXML(node, indentation, out) {
  "use strict";
  var value,
    item,
    i;
  if (node.nodeName.toLowerCase() === "#text") {
    out += node.nodeValue;
  } else {
    out += indentation + "<" + node.nodeName.toLowerCase();
    if (node.attributes !== null) {
      for (i = 0; i < node.attributes.length; i += 1) {
        item = node.attributes.item(i);
        value = item.nodeValue;
        if (value === null) {
          value = "";
        }
        out += " " + item.nodeName + "=\"" + value + "\"";
      }
    }
    if (node.nodeName.toLowerCase() === "div") {
      out += ">\n";
    } else {
      out += ">";
    }
    for (i = 0; i < node.childNodes.length; i += 1) {
      item = node.childNodes.item(i);
      out = nodeToXML(item, indentation + "   ", out);
    }
    if (node.nodeValue !== null) {
      out += indentation + "   " + node.nodeValue + "\n";
    }
    if (node.nodeName.toLowerCase() === "div") {
      out += indentation + "</" + node.nodeName.toLowerCase() + ">\n";
    } else {
      out += "</" + node.nodeName.toLowerCase() + ">\n";
    }
  }
  return out;
}
function show(doc) {
  "use strict";
  var w = window.open('', 'Popup', ''),
    s = nodeToXML(doc, '', '');
  w.document.write('<html><head><title>Document Dump</title>');
  w.document.write('</head><body><pre>');
  s = s.replace(new RegExp('&', 'g'), '&amp;');
  s = s.replace(new RegExp('<', 'g'), '&lt;');
  s = s.replace(new RegExp('>', 'g'), '&gt;');
  w.document.write(s);
  w.document.write('</pre></body></html>');
  w.document.close();
}
function createTree() {
  "use strict";
  var main = $("<div id=\"maincorpse\"></div>");
  main.css("display", "none");
  $("#nav a.menu").each(function (index) {
    var pathstr = $(this).attr("rel"),
      path = pathstr.split(" "),
      curdiv;
    if (path.length === 1) {
      $("<div id=\"" + path[0] + "\" class=\"article\"><h2>" + $(this).text() + "</h2>").appendTo(main);
    } else {
      curdiv = $("#" + path[path.length - 2], main);
      $("<div id=\"" + path[path.length - 1] + "\" class=\"article\"><h3>" + $(this).text() + "</h3>").appendTo(curdiv);
    }
  });
  main.appendTo($(document.body));
  show(main[0]);
}
$(function () {
  "use strict";
  loadMenu("faq");
  $("#nav").treeview({
    collapsed : false,
    animated : "fast"
  });
  $(".menu").click(function () {
    var pathstr = $(this).attr("rel");
    viewArticle(pathstr);
  });
  viewArticle("overview");
  $('#search').click(function () {viewArticle('overview mainelements search'); });
  $('#bookmarks').click(function () {viewArticle('overview mainelements bookmark'); });
  $('#category').click(function () {viewArticle('manage category'); });
  $('#impexp').click(function () {viewArticle('overview mainelements impexp'); });
  $('.extmain').click(function () {
    chrome.runtime.sendMessage({
      action : 'openExtensionMainPage'
    }, function (response) {});
  });
});