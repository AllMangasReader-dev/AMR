var pstat = {};
pstat.webdb = {};
pstat.webdb.db = null;

pstat.webdb.open = function() {
  var dbSize = 5 * 1024 * 1024; // 5MB
  pstat.webdb.db = openDatabase("AMR", "1.0", "All mangas reader", dbSize);
};

pstat.webdb.createTable = function() {
  var db = pstat.webdb.db;
  db.transaction(function(tx) {
    tx.executeSql("CREATE TABLE IF NOT EXISTS pstat(ID INTEGER PRIMARY KEY ASC, mirror TEXT, mgname TEXT, mgurl TEXT, chapname TEXT, chaptext TEXT, time_spent INTEGER, added_on DATETIME)", []);
  });
};

pstat.webdb.addStat = function(obj, callback) {
  var db = pstat.webdb.db;
  db.transaction(function(tx){
    var addedOn = new Date().getTime();
    tx.executeSql("INSERT INTO pstat(mirror, mgname, mgurl, chapname, chaptext, time_spent, added_on) VALUES (?,?,?,?,?,?,?)",
        [obj.mirror, obj.name, obj.url, obj.lastChapterReadName, obj.lastChapterReadURL, 0, addedOn],
        function(tx, sql_res) {
          callback(sql_res.insertId);  
        },
        pstat.webdb.onError);
   });
};

pstat.webdb.updateStat = function(id, time, callback) {
  var db = pstat.webdb.db;
  db.transaction(function(tx){
    var addedOn = new Date();
    tx.executeSql("update pstat set time_spent = ? where ID = ?",
        [time, id],
        callback,
        pstat.webdb.onError);
   });
};

pstat.webdb.deleteStat = function(id, callback) {
  var db = pstat.webdb.db;
  db.transaction(function(tx){
    tx.executeSql("delete from pstat where ID = ?",
        [id],
        callback,
        pstat.webdb.onError);
   });
};

pstat.webdb.onError = function(tx, e) {
  alert("There has been an error: " + e.message);
};

pstat.webdb.getAllPStat = function(renderFunc) {
  var db = pstat.webdb.db;
  db.transaction(function(tx) {
    tx.executeSql("SELECT * FROM pstat", [], renderFunc,
        pstat.webdb.onError);
  });
};

pstat.init = function() {
  pstat.webdb.open();
  pstat.webdb.createTable();
};
