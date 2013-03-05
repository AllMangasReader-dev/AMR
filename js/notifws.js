function openDiscuss() {
    var data = JSON.parse(document.location.hash.slice(1));
    chrome.extension.sendRequest({action: "opentab", url: "http://community.allmangasreader.com/comments.php?type=1&id=" + data.idext}, function(response) {});
}

$(function() {
  var data = JSON.parse(document.location.hash.slice(1));
  if (data.revision > 0) {
    if (data.isnew) {
      $("#updtws").hide();
      $("#tempws").hide();
    } else {
      $("#newws").hide();
      $("#tempws").hide();
    }
  } else {
    $("#updtws").hide();
    $("#newws").hide();
  }
  $('.website').text(data.ws);
  $('.dev').text(data.developer);
  $('.rev').text(data.revision);
  
  $(".discuss").click(function() {
    openDiscuss();
  });
});
