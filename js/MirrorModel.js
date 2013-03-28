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

//CHANGE here the classname
var MirrorClassName = {
  //CHANGE : Name of the mirror
  mirrorName : "",
  //CHANGE : True if the mirror can list all of its mangas.
  canListFullMangas : true,
  //CHANGE : Extension internal link to the icon of the mirror. (if not filled, will be blank...)
  mirrorIcon : "",

  //Return true if the url corresponds to the mirror
  isMe : function(url) {
    //CHANGE IMPLEMENTATION
    //Example : return (url.indexOf("yourmirror.com") != -1);
  },
  
  //Return the list of all or part of all mangas from the mirror
  //The search parameter is filled if canListFullMangas is false
  //This list must be an Array of [["manga name", "url"], ...]
  //This function must call callback("Mirror name", [returned list]);
  getMangaList : function(search, callback) {
     $.ajax(
        {
          //CHANGE URL HERE
          url: "url to load in which manga list will be found",
          
          //KEEP THE HEADERS, THEY PREVENT CHROME TO LOAD URL FROM CACHE
          beforeSend: function(xhr) {
            xhr.setRequestHeader("Cache-Control", "no-cache");
            xhr.setRequestHeader("Pragma", "no-cache");
          }, 
           
          success: function( objResponse ){
            var div = document.createElement( "div" );  
            div.innerHTML = objResponse;
            var res = [];
            //BROWSE div object and fill res array
            //...
            
            //CHANGE NAME HERE
            callback("MirrorClassName", res);
          }
    });
  }, 
  
  //Find the list of all chapters of the manga represented by the urlManga parameter
  //This list must be an Array of [["chapter name", "url"], ...]
  //This list must be sorted descending. The first element must be the most recent.
  //This function MUST call callback([list of chapters], obj);
  getListChaps : function(urlManga, mangaName, obj, callback) {
     $.ajax(
        {
          //CHANGE URL HERE
          url: "url to load in which chapters list will be found for this manga",
          
          //KEEP THE HEADERS, THEY PREVENT CHROME TO LOAD URL FROM CACHE
          beforeSend: function(xhr) {
            xhr.setRequestHeader("Cache-Control", "no-cache");
            xhr.setRequestHeader("Pragma", "no-cache");
          }, 
          
          success: function( objResponse ){
            var div = document.createElement( "div" ); 
            div.innerHTML = objResponse;
            
            var res = [];
            //BROWSE div object and fill res array
            //...
            
            //RETURNED LIST MUST BE IN DESCENDING ORDER, IF NOT, UNCOMMENT THE LINE
            //res = res.reverse();
            
            callback(res, obj);
          }
    });
  },

  /********************************************************************************************************
    IMPORTANT NOTE : methods which are running in the DOM of the page could directly use this DOM.
    However, if you want to test the mirror with the lab, you must use the two arguments (doc and curUrl)
    of these methods to avoid using window.location.href (replaced by curUrl) and manipulate the DOM within
    the object doc (example, replace $("select") by $("select", doc) in jQuery).
  ********************************************************************************************************/

  //This method must return (throught callback method) an object like : 
  //{"name" : Name of current manga, 
  //  "currentChapter": Name of thee current chapter (one of the chapters returned by getListChaps), 
  //  "currentMangaURL": Url to access current manga, 
  //  "currentChapterURL": Url to access current chapter}
  getInformationsFromCurrentPage : function(doc, curUrl, callback) {
    //This function runs in the DOM of the current consulted page.
    var name;
    var currentChapter;
    var currentMangaURL;
    var currentChapterURL;
    
    //FILL THE ABOVE VARIABLES HERE...
    //...
    
    /*console.log(" name : " + name +  
            " currentChapter : " + currentChapter + 
            " currentMangaURL : " + currentMangaURL + 
            " currentChapterURL : " + currentChapterURL);*/

    callback({"name": name, 
            "currentChapter": currentChapter, 
            "currentMangaURL": currentMangaURL, 
            "currentChapterURL": currentChapterURL});
  }, 
  
  //Returns the list of the urls of the images of the full chapter
  //This function can return urls which are not the source of the
  //images. The src of the image is set by the getImageFromPageAndWrite() function.
  getListImages : function(doc, curUrl) {
    //This function runs in the DOM of the current consulted page.
    var res = [];
    //FILL THE RES ARRAY HERE
    //...
    
    return res;
  },
  
  //Remove the banners from the current page
  removeBanners : function(doc, curUrl) {
    //This function runs in the DOM of the current consulted page.
  },
  
  //This method returns the place to write the full chapter in the document
  //The returned element will be totally emptied.
  whereDoIWriteScans : function(doc, curUrl) {
    //This function runs in the DOM of the current consulted page.
    //YOU MUST RETURN ONLY ONE PLACE
    //you can change the DOM of the page before this method is called in doSomethingBeforeWritingScans
    return null;
  },
  
  //This method returns places to write the navigation bar in the document
  //The returned elements won't be emptied.
  whereDoIWriteNavigation : function(doc, curUrl) {
    //This function runs in the DOM of the current consulted page.
    //YOU MUST RETURN TWO PLACES (ON TOP AND AT THE BOTTOM OF THE CHAPTER)
    //you can change the DOM of the page before this method is called in doSomethingBeforeWritingScans
    return null;
  },
  
  //Return true if the current page is a page containing scan.
  isCurrentPageAChapterPage : function(doc, curUrl) {
    //VERIFY HERE THAT THE PAGE CONTAINS A SCAN
    return false;
  },
  
  //This method is called before displaying full chapters in the page
  doSomethingBeforeWritingScans : function(doc, curUrl) {
    //This function runs in the DOM of the current consulted page.
    //PREPARE THE PAGE TO HOST NAVIGATION AND THE FULL CHAPTER
    //you may need to change elements in the page, add elements, remove others and change css
  },
  
  //This method is called to fill the next button's url in the manga site navigation bar
  //The select containing the mangas list next to the button is passed in argument
  nextChapterUrl : function(select, doc, curUrl) {
    //This function runs in the DOM of the current consulted page.
    var chapRes = null;
    //FILL CHAPRES WITH THE URL OF NEXT CHAPTER
    return chapRes;
  },
  
  //This method is called to fill the previous button's url in the manga site navigation bar
  //The select containing the mangas list next to the button is passed in argument
  previousChapterUrl : function(select, doc, curUrl) {
    //This function runs in the DOM of the current consulted page.
    var chapRes = null;
    //FILL CHAPRES WITH THE URL OF PREVIOUS CHAPTER
    return chapRes;
  },
  
  //Write the image from the the url returned by the getListImages() function.
  //The function getListImages can return an url which is not the source of the
  //image. The src of the image is set by this function.
  //If getListImages function returns the src of the image, just do $( image ).attr( "src", urlImg );
  getImageFromPageAndWrite : function(urlImg, image, doc, curUrl) {
    //This function runs in the DOM of the current consulted page.
    //IF URL IS IMAGE URL --> $( image ).attr( "src", urlImg );
  },
  
  //If it is possible to know if an image is a credit page or something which 
  //must not be displayed as a book, just return true and the image will stand alone
  //img is the DOM object of the image
  isImageInOneCol : function(img, doc, curUrl) {
    //This function runs in the DOM of the current consulted page.
    //DO NOT CHANGE IF NOT NEEDED, NOT USED BY ANY EXISTING MIRROR AND CHAPTER'S DISPLAY IS WORKING FINE FOR THEM
    return false;
  },
  
  //This function can return a preexisting select from the page to fill the 
  //chapter select of the navigation bar. It avoids to load the chapters
  getMangaSelectFromPage : function(doc, curUrl) {
    //This function runs in the DOM of the current consulted page.
    //RETURN A SELECT IF NEEDED, ELSE, THE EXTENSIOn WILL FIND CHAPTER BY IT'S OWN MEANS
    return null;
  },
  
  //This function is called when the manga is full loaded. Just do what you want here...
  doAfterMangaLoaded : function(doc, curUrl) {
    //This function runs in the DOM of the current consulted page.
    
    //THE FOLLOWING LINE IS NECESSARY IN MOST OF CASES
    $("body > div:empty", doc).remove();
    
    //DO ANYTHING ELSE YOU NEED
  }
}

}
