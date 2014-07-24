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

var menusAMR = [
  {name: "options", link: "options.html", title: "Options", icon: "options.png"},
  {name: "search", link: "search.html", title: "Search", icon: "find.png"},
  {name: "bookmarks", link: "bookmarks.html", title: "Bookmarks", icon: "bookmark.png"},
  {name: "stats", link: "pstat.html", title: "My stats", icon: "pstat.png"},
  {name: "impexp", link: "importexport.html", title: "Import/Export", icon: "importexport.png"},
  {name: "faq", link: "faq.html", title: "Help", icon: "infos.png"},
  {name: "release", link: "http://wiki.allmangasreader.com/changelog", title: "Changelog", icon: "release.png"},
  {name: "dev", link: "dev.html", title: "Development", icon: "code.png"},
  {name: "lab", link: "lab.html", title: "Lab", cond: "lab", icon: "dev.png"},
  {name: "home", link: "http://allmangasreader.com/", title: "Home", icon: "home.png"}
];

var dispIcons = false;
function loadMenu(cur) {
  chrome.runtime.sendMessage({"action": "parameters"}, function(response) {
    $("#menuitems ul").empty();
    $.each(menusAMR, function(ind, val) {
      var display = true;
      if (val.cond && val.cond == "lab") {
        if (response.dev != 1) {
          display = false;
        }
      }
      if (display) {
        var li;
        if (val.name == cur) {
          if (!dispIcons) {
            li = $("<li class=\"selected\">" + val.title + "</li>");
          } else {
            li = $("<li class=\"selected\"><img src=\"img/" + val.icon + "\" title=\"" + val.title + "\" /></li>");
          }
        } else {
          if (!dispIcons) {
            li = $("<li><a href=\"" + val.link + "\">" + val.title + "</a></li>");
          } else {
            li = $("<li><a href=\"" + val.link + "\"><img src=\"img/" + val.icon + "\" title=\"" + val.title + "\" /></a></li>");
          }
        }
        if (ind == menusAMR.length - 1) {
          li.addClass("last");
        }
        li.appendTo($("#menuitems ul"));
      }
    });
  });
}
