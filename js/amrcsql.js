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

var amrcsql = {};
amrcsql.webdb = {};
amrcsql.webdb.db = null;

amrcsql.webdb.open = function() {
  var dbSize = 100 * 1024 * 1024; // 100MB max...
  amrcsql.webdb.db = openDatabase("AMR", "1.0", "All mangas reader", dbSize);
};

amrcsql.webdb.createTable = function() {
  var db = amrcsql.webdb.db;
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

amrcsql.webdb.storeWebsite = function(amrcObject, callback) {
  var db = amrcsql.webdb.db;
  db.transaction(function(tx){
    tx.executeSql("INSERT INTO websites(idext, objectName, mirrorName, websites, revision, developer, icon, url, code, activated) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [amrcObject.id, amrcObject.objectName, amrcObject.mirrorName, JSON.stringify(amrcObject.webSites), amrcObject.revision, amrcObject.developer, amrcObject.mirrorIcon, amrcObject.mirrorUrl, amrcObject.jsCode, 1],
        function(tx, sql_res) {callback();},
        function(tx, e) {console.log("Error while inserting " + amrcObject.id + " for mirror " + amrcObject.mirrorName);}
    );
  });
};

amrcsql.webdb.updateWebsite = function(amrcObject, callback) {
  var db = amrcsql.webdb.db;
  db.transaction(function(tx){
    tx.executeSql("update websites set idext = ?, objectName = ?, websites = ?, revision = ?, developer = ?, icon = ?, url = ?, code = ? where mirrorName = ?",
        [amrcObject.id, amrcObject.objectName, JSON.stringify(amrcObject.webSites), amrcObject.revision, amrcObject.developer, amrcObject.mirrorIcon, amrcObject.mirrorUrl, amrcObject.jsCode, amrcObject.mirrorName],
        function(tx, sql_res) {callback();},
        function(tx, e) {console.log("Error while inserting " + amrcObject.id + " for mirror " + amrcObject.mirrorName);}
    );
  });
};

amrcsql.webdb.onError = function(tx, e) {
  alert("There has been an error: " + e.message);
};

amrcsql.webdb.getWebsites = function(callback) {
  var db = amrcsql.webdb.db;
  db.transaction(function(tx) {
    tx.executeSql("SELECT * FROM websites", [], 
      function(tx, res) {
        var ret = [];
        if (res.rows.length > 0) {
          for (var i = 0; i < res.rows.length; i++) {
            if(res.rows.item(i).websites!=="undefined"){
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
            };
          }
        }
        callback(ret);
      },
      amrcsql.webdb.onError
    );
  });
};

amrcsql.init = function() {
  amrcsql.webdb.open();
  amrcsql.webdb.createTable();
};
