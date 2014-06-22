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

$(function() {
  $(".importamrhead").show();
  $(".importamr").show();
  $(".labamr").show();
  $("<img class='importimplemamr' width='16' src='" + chrome.extension.getURL("img/amrlittle.png") + "' title='Import this implementation in your AMR' />").appendTo($(".importamr"));
  $("<img class='labimplemamr' src='" + chrome.extension.getURL("img/dev.png") + "' title='Import this implementation in your AMR and view it in the lab' />").appendTo($(".labamr"));
  
  $(".importamr").click(function() {
    if ($(this).hasClass("disabled")) {
      alert("You have changed parts of the code... You must update the implementation before importing it.");
    } else {
      var _self = this;
      var _id;
      if ($(this).is(".button")) {
        _id = $("input[name='wid']").val();
      } else {
        _id = $(_self).closest("tr").attr("rel");
      }
      var req = {
        action: "importimplementation",
        id: _id
      };
      sendExtRequest(req, $(this).is(".button") ? $(this) : $(".importimplemamr", $(this)), function() {}, true); 
    }
  });
  
  $(".labamr").click(function() {
    if ($(this).hasClass("disabled")) {
      alert("You have changed parts of the code... You must update the implementation before importing it.");
    } else {
      var _self = this;
      var _id;
      if ($(this).is(".button")) {
        _id = $("input[name='wid']").val();
      } else {
        _id = $(_self).closest("tr").attr("rel");
      }
      var req = {
        action: "importimplementation",
        id: _id
      };
      sendExtRequest(req, $(this).is(".button") ? $(this) : $(".labimplemamr", $(this)), function(response) {
        chrome.runtime.sendMessage({action: "opentab", url: chrome.extension.getURL("lab.html?mirror=" + response.mirror)}, function() {});
      }, true);
    }
  });
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
      _ancSrc = $("<img src='" + chrome.extension.getURL("img/ltload.gif") + "'></img>")
      _ancSrc.appendTo(button);
    }
    if (button.is(".category") || button.is(".mgcategory")) {
      _ancSrc = $("<img src='" + chrome.extension.getURL("img/load10.gif") + "'></img>")
      _ancSrc.appendTo(button);
    }
  }
  //Call the action
  chrome.runtime.sendMessage(request, function(response) {
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
}
