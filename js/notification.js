function openTab(urlToOpen) {
    chrome.extension.sendRequest({action: "opentab", url: urlToOpen}, function(response) {});
}

$(function() {
  var data = JSON.parse(document.location.hash.slice(1));
  $('#name').text(data.name);
  $('#mirror').text(data.mirror);
  $(document.body).bind('click', function()
  {
      openTab(data.url);
      window.close();
  });
});
