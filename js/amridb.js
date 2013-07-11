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

/*

*/

var amrDB = {};
var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB;
amrDB.indexedDB = {};
amrDB.indexedDB.db = null;
amrDB.indexedDB.open = function() {
        var request = indexedDB.open("amrs");

        request.onsuccess = function(e) {
          var v = "2.0 beta"; // yes! you can put strings in the version not just numbers
          amrDB.indexedDB.db = e.target.result;
          var db = amrDB.indexedDB.db;
          // We can only create Object stores in a setVersion transaction;
          if (v!= db.version) {
            var setVrequest = db.setVersion(v);

            // onsuccess is the only place we can create Object Stores
            setVrequest.onsuccess = function(e) {
              if(db.objectStoreNames.contains("amr")) {
                db.deleteObjectStore("amr");
              }
              var store = db.createObjectStore("amr",
              {keyPath: "timeStamp"});
              amrDB.indexedDB.getAllamrItems();
            };
          }
          else {
            amrDB.indexedDB.getAllamrItems();
          }
        };
        request.onfailure = amrDB.indexedDB.onerror;
      }
      
}

amridb.indexedDB.createTable = function() {
  var db = amridb.indexedDB.db;
  db.transaction(function(tx) {
    tx.executeSql("CREATE TABLE IF NOT EXISTS websites( id INTEGER PRIMARY KEY ASC, " +
                                                       "idext INTEGER, " +
                                                       "objectName TEXT, " +
                                                       "mirrorName TEXT, " +
                                                       "websites TEXT, " +
                                                       "revision INTEGER, " +
                                                       "developer TEXT, " +
                                                       "icon TEXT, " +
                                                       "url TEXT, " +
                                                       "code TEXT, " +
                                                       "activated INTEGER)", []);
  });
};

amridb.indexedDB.storeWebsite = function(amrcObject, callback) {
  var db = amridb.indexedDB.db;
  db.transaction(function(tx){
    tx.executeSql("INSERT INTO websites(idext, objectName, mirrorName, websites, revision, developer, icon, url, code, activated) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [amrcObject.id, amrcObject.objectName, amrcObject.mirrorName, JSON.stringify(amrcObject.webSites), amrcObject.revision, amrcObject.developer, amrcObject.mirrorIcon, amrcObject.mirrorUrl, amrcObject.jsCode, 1],
        function(tx, sql_res) {callback();},
        function(tx, e) {console.log("Error while inserting " + amrcObject.id + " for mirror " + amrcObject.mirrorName);}
    );
  });
};

amridb.indexedDB.updateWebsite = function(amrcObject, callback) {
  var db = amridb.indexedDB.db;
  db.transaction(function(tx){
    tx.executeSql("update websites set idext = ?, objectName = ?, websites = ?, revision = ?, developer = ?, icon = ?, url = ?, code = ? where mirrorName = ?",
        [amrcObject.id, amrcObject.objectName, JSON.stringify(amrcObject.webSites), amrcObject.revision, amrcObject.developer, amrcObject.mirrorIcon, amrcObject.mirrorUrl, amrcObject.jsCode, amrcObject.mirrorName],
        function(tx, sql_res) {callback();},
        function(tx, e) {console.log("Error while inserting " + amrcObject.id + " for mirror " + amrcObject.mirrorName);}
    );
  });
};

amridb.indexedDB.onError = function(tx, e) {
  alert("There has been an error: " + e.message);
};

amridb.indexedDB.getWebsites = function(callback) {
  var db = amridb.indexedDB.db;
  db.transaction(function(tx) {
    tx.executeSql("SELECT * FROM websites", [], 
      function(tx, res) {
        var ret = [];
        if (res.rows.length > 0) {
          for (var i = 0; i < res.rows.length; i++) {
            ret[ret.length] = {
              id: res.rows.item(i).id, 
              idext: res.rows.item(i).idext, 
              objectName: res.rows.item(i).objectName, 
              mirrorName: res.rows.item(i).mirrorName, 
              webSites: JSON.parse(res.rows.item(i).websites), 
              revision: res.rows.item(i).revision, 
              developer: res.rows.item(i).developer, 
              mirrorIcon: res.rows.item(i).icon, 
              mirrorUrl: res.rows.item(i).url, 
              jsCode: res.rows.item(i).code, 
              activated: (res.rows.item(i).activated == 1), 
            };
          }
        }
        callback(ret);
      },
      amridb.indexedDB.onError
    );
  });
};

amridb.init = function() {
  amridb.indexedDB.open();
  amridb.indexedDB.createTable();
};
