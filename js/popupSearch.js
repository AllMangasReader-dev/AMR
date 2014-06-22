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
var tempMirrorListAll,
    nbToLoad,
    ancNbToLoad,
    curSearch,
    isOver;
function sendExtRequestS(request, button, callback, backsrc) {
    if (button.data("currentlyClicked"))
        return;
    button.data("currentlyClicked", true);
    var _ancSrc;
    if (button.is("img")) {
        _ancSrc = button.attr("src");
        button.attr("src", chrome.extension.getURL("img/load16.gif"));
    }
    chrome.runtime.sendMessage(request, function () {
        callback();
        if (button.is("img")) {
            if (backsrc) {
                button.attr("src", _ancSrc);
            }
        }
        button.removeData("currentlyClicked");
    });
}
function switchOnglet(ong, tab) {
    var ongsTitle = getElementsByClass("onglet", document);
    for (var i = 0; i < ongsTitle.length; i++) {
        ongsTitle[i].className = "onglet";
    }
    ong.className += " active";
    var ongsCont = getElementsByClass("ongletCont", document);
    for (i = 0; i < ongsCont.length; i++) {
        ongsCont[i].style.display = "none";
    }
    document.getElementById(tab).style.display = "table";
}
function isMirrorEnable(mirrorName) {
    if (localStorage["searchMirrorsState"] !== undefined) {
        var obj = JSON.parse(localStorage["searchMirrorsState"]);
        for (var i = 0; i < obj.length; i++) {
            if (obj[i].mirror == mirrorName) {
                return obj[i].state;
            }
        }
    }
    return true;
}
function setMirrorState(mirrorName, state) {
    if (localStorage["searchMirrorsState"] !== undefined) {
        var obj = JSON.parse(localStorage["searchMirrorsState"]);
        var isFound = false;
        for (var i = 0; i < obj.length; i++) {
            if (obj[i].mirror == mirrorName) {
                obj[i] = {
                    'mirror' : mirrorName,
                    'state' : state
                };
                localStorage["searchMirrorsState"] = JSON.stringify(obj);
                isFound = true;
                break;
            }
        }
        if (!isFound) {
            obj[obj.length] = {
                'mirror' : mirrorName,
                'state' : state
            };
            localStorage["searchMirrorsState"] = JSON.stringify(obj);
        }
    } else {
        localStorage["searchMirrorsState"] = JSON.stringify([{
                        'mirror' : mirrorName,
                        'state' : state
                    }
                ]);
    }
}
function loadSearch() {
    loadSelectors();
    for (var i = 0; i < mirrors.length; i++) {
        var newItem = $("<div class='mirrorF'><table><tr><td class='mirrorIcon'><img src='" + mirrors[i].mirrorIcon + "' title='" + mirrors[i].mirrorName + "'/></td></tr><tr><td class='mirrorStatus'><img src='" + chrome.extension.getURL("img/gray.png") + "'/></td></tr></table></div>");
        newItem.appendTo($("#filMirrors"));
        if (!isMirrorEnable(mirrors[i].mirrorName)) {
            $(".mirrorIcon img", newItem).addClass("disabled");
            $(".mirrorStatus img", newItem).hide();
        }
    }
    $(".mirrorIcon img").click(function () {
        $(this).toggleClass("disabled");
        if ($(this).hasClass("disabled")) {
            $("img", $(this).closest("tr").next()).hide();
            setMirrorState($(this).attr("title"), false);
        } else {
            $("img", $(this).closest("tr").next()).show();
            setMirrorState($(this).attr("title"), true);
        }
    });
    if (localStorage["searchAllRequest"] !== undefined) {
        document.getElementById("searchBoxInput").value = localStorage["searchAllRequest"];
    }
    var listTmpSearch = localStorage["searchAll"];
    var listTmpSearchLst = [];
    if (!(listTmpSearch === undefined || listTmpSearch === null || listTmpSearch == "null")) {
        var lstTmp = JSON.parse(listTmpSearch);
        for (i = 0; i < lstTmp.length; i++) {
            listTmpSearchLst[i] = lstTmp[i];
        }
    }
    if (listTmpSearchLst.length > 0) {
        fillListOfSearchAll(listTmpSearchLst);
    }
}
function loadSelectors() {
    var selAll = $("<img src='" + chrome.extension.getURL("img/select_all.png") + "' title='Select all'/>");
    var selNone = $("<img src='" + chrome.extension.getURL("img/select_none.png") + "' title='Select none'/>");
    var selUsed = $("<img src='" + chrome.extension.getURL("img/bookmark.png") + "' title='Select all on which i have at least one manga in my list'/>");
    selAll.click(function () {
        $(".mirrorIcon img").each(function (index) {
            $(this).removeClass("disabled");
            $("img", $(this).closest("tr").next()).show();
            setMirrorState($(this).attr("title"), true);
        });
        $("#selectors select option:first").attr("selected", true);
        localStorage["searchLanguage"] = $("#selectors select option:selected").val();
    });
    selNone.click(function () {
        $(".mirrorIcon img").each(function (index) {
            $(this).addClass("disabled");
            $("img", $(this).closest("tr").next()).hide();
            setMirrorState($(this).attr("title"), false);
        });
        $("#selectors select option:first").attr("selected", true);
        localStorage["searchLanguage"] = $("#selectors select option:selected").val();
    });
    selUsed.click(function () {
        var unused = MgUtil.getUnusedNames(mirrors, JSON.parse(localStorage["mangas"]));
        $(".mirrorIcon img").each(function (index) {
            var isFound = false;
            for (var i = 0; i < unused.length; i++) {
                if (unused[i] == $(this).attr("title")) {
                    isFound = true;
                    break;
                }
            }
            if (isFound) {
                $(this).addClass("disabled");
                $("img", $(this).closest("tr").next()).hide();
                setMirrorState($(this).attr("title"), false);
            } else {
                $(this).removeClass("disabled");
                $("img", $(this).closest("tr").next()).show();
                setMirrorState($(this).attr("title"), true);
            }
        });
        $("#selectors select option:first").attr("selected", true);
        localStorage["searchLanguage"] = $("#selectors select option:selected").val();
    });
    selAll.appendTo($("#selectors"));
    selNone.appendTo($("#selectors"));
    selUsed.appendTo($("#selectors"));
    var sel = MgUtil.getLanguageSelect(mirrors);
    sel.change(function () {
        var lang = $("option:selected", $(this)).val();
        if (lang == "all") {
            $(".mirrorIcon img").each(function (index) {
                $(this).removeClass("disabled");
                $("img", $(this).closest("tr").next()).show();
                setMirrorState($(this).attr("title"), true);
            });
        } else {
            var langMirrors = MgUtil.getMirrorsFromLocale(mirrors, lang);
            $(".mirrorIcon img").each(function (index) {
                var isFound = false;
                for (var i = 0; i < langMirrors.length; i++) {
                    if (langMirrors[i] == $(this).attr("title")) {
                        isFound = true;
                        break;
                    }
                }
                if (!isFound) {
                    $(this).addClass("disabled");
                    $("img", $(this).closest("tr").next()).hide();
                    setMirrorState($(this).attr("title"), false);
                } else {
                    $(this).removeClass("disabled");
                    $("img", $(this).closest("tr").next()).show();
                    setMirrorState($(this).attr("title"), true);
                }
            });
        }
        localStorage["searchLanguage"] = $("#selectors select option:selected").val();
    });
    if (localStorage["searchLanguage"])
        sel.val(localStorage["searchLanguage"]);
    var spansel = $("<span class='custom-select'></span>");
    sel.appendTo(spansel);
    spansel.appendTo($("#selectors"));
}
function search() {
    var toFind = document.getElementById("searchBoxInput").value;
    if (toFind.length === 0) {
        alert("You must key something to search !");
    } else {
        refreshSearchAll(toFind);
    }
}
function refreshSearchAll(toSearch) {
    isOver = false;
    tempMirrorListAll = [];
    nbToLoad = mirrors.length;
    ancNbToLoad = nbToLoad;
    localStorage["searchAllRequest"] = toSearch;
    for (var i = 0; i < mirrors.length; i++) {
        var isEnabled = true;
        $(".mirrorIcon img").each(function (index) {
            if ($(this).attr("title") == mirrors[i].mirrorName) {
                if ($(this).hasClass("disabled")) {
                    isEnabled = false;
                    nbToLoad--;
                    ancNbToLoad--;
                } else {
                    $("img", $(this).closest("tr").next()).attr("src", chrome.extension.getURL("img/ltload.gif"));
                }
            }
        });
        if (isEnabled) {
            if (mirrors[i].canListFullMangas) {
                wssql.webdb.getMangaList(mirrors[i].mirrorName, function (list, mirror) {
                    if (list && list !== null && list.length > 0) {
                        for (var j = 0; j < list.length; j++) {
                            if (formatMgName(list[j][0]).indexOf(formatMgName(toSearch)) != -1) {
                                var obj = {};
                                obj.url = list[j][1];
                                obj.name = list[j][0];
                                obj.mirror = mirror;
                                tempMirrorListAll[tempMirrorListAll.length] = obj;
                            }
                            if (tempMirrorListAll.length > 1000) {
                                isOver = true;
                                nbToLoad = 0;
                                break;
                            }
                        }
                    }
                    $(".mirrorIcon img").each(function (index) {
                        if ($(this).attr("title") == mirror) {
                            $("img", $(this).closest("tr").next()).attr("src", chrome.extension.getURL("img/blue.png"));
                        }
                    });
                    nbToLoad--;
                });
            } else if (mirrors[i].getMangaList) {
                curSearch = toSearch;
                mirrors[i].getMangaList(toSearch, mangaListAllLoaded);
            }
        }
    }
    waitForEndLoad();
}
function formatMgName(name) {
    if (name === undefined || name === null || name == "null")
        return "";
    return name.trim().replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}
function fillListOfSearchAll(lst) {
    $("#resTr").css("display", "table-row");
    $("#results").empty();
    if (lst.length > 0) {
        $("#nores").css("display", "none");
        $("#results").css("display", "block");
        $("<table id='allres'></table>").appendTo($("#results"));
        var ancName = "";
        var lstCur = [];
        var nbForPij = 0;
        for (var j = 0; j < lst.length; j++) {
            if (ancName !== "" && lstCur.length > 0 && formatMgName(lst[j].name) != ancName) {
                fillCurrentLstSingleMg(lstCur, nbForPij);
                nbForPij++;
                lstCur = [];
            }
            lstCur[lstCur.length] = lst[j];
            ancName = formatMgName(lst[j].name);
        }
        if (lstCur.length > 0) {
            fillCurrentLstSingleMg(lstCur, nbForPij);
        }
        bindSearchGlobActs();
        if (nbForPij !== 0) {
            $("#nbRes").css("display", "block");
            if (lst.length >= 900 || isOver) {
                $("#nbRes").html("<span>" + nbForPij + " manga found ! (" + lst.length + " places to read them !)</span><br /><span>There is too much results, only the first results are displayed. (All web sites have not been searched)</span>");
            } else {
                $("#nbRes").text(nbForPij + " manga found ! (" + lst.length + " places to read them !)");
            }
        }
    } else {
        $("#nores").css("display", "block");
        $("#results").css("display", "none");
        $("#nbRes").css("display", "none");
    }
}
function fillCurrentLstSingleMg(lstCur, nbForPij) {
    var nameCur = lstCur[lstCur.length - 1].name;
    var trCur;
    if (nbForPij % 2 === 0) {
        trCur = $("<tr class='odd'></tr>");
    } else {
        trCur = $("<tr class='even'></tr>");
    }
    if (nbForPij === 0) {
        trCur.addClass("firstLine");
    }
    var tdHead = $("<td class='mangaName'></td>");
    $("<span>" + nameCur + "</span><div class='optmgsearch'><img class='externsearch' src='img/external.png' title='Open all occurences of this manga on their respective websites'/><img class='addsearch' src='img/add.png' title='Add all occurences of this manga in your manga list'/></div>").appendTo(tdHead);
    tdHead.appendTo(trCur);
    trCur.appendTo($("#allres"));
    var tdMgs = $("<td class='listMirror'></td>");
    tdMgs.appendTo(trCur);
    for (var i = 0; i < lstCur.length; i++) {
        if (getMangaMirror(lstCur[i].mirror) !== null) {
            var urlCur = lstCur[i].url;
            var mirrorCur = lstCur[i].mirror;
            var img = $("<img class='mirrorsearchimg' src='" + getMangaMirror(lstCur[i].mirror).mirrorIcon + "' title=\"" + nameCur + " on " + lstCur[i].mirror + "\" />");
            img.data("urlmirror", urlCur);
            img.data("mirrorname", lstCur[i].mirror);
            img.data("manganame", nameCur);
            var divelt = $("<div class='eltmirrorsearch'><img class='addsinglemg' src='img/addlt.png' title='Add this manga in your list on " + lstCur[i].mirror + "'/></div>");
            divelt.prepend(img);
            divelt.appendTo(tdMgs);
        }
    }
}
function bindSearchGlobActs() {
    $(".mirrorsearchimg").click(function () {
        chrome.runtime.sendMessage({
            action : 'opentab',
            url : $(this).data("urlmirror")
        }, function (response) {});
    });
    $(".externsearch").click(function () {
        $(".mirrorsearchimg", $(this).closest("td").next()).each(function (index) {
            chrome.runtime.sendMessage({
                action : 'opentab',
                url : $(this).data("urlmirror")
            }, function (response) {});
        });
    });
    $(".addsinglemg").click(function () {
        var img = $("img.mirrorsearchimg", $(this).closest(".eltmirrorsearch"));
        var obj = {
            action : "readManga",
            mirror : img.data("mirrorname"),
            url : img.data("urlmirror"),
            name : img.data("manganame")
        };
        sendExtRequestS(obj, $(this), function () {}, true);
    });
    $(".addsearch").click(function () {
        var obj = {
            action : "readMangas",
            list : []
        };
        $(".mirrorsearchimg", $(this).closest("td").next()).each(function (index) {
            obj.list[obj.list.length] = {
                mirror : $(this).data("mirrorname"),
                url : $(this).data("urlmirror"),
                name : $(this).data("manganame")
            };
        });
        sendExtRequestS(obj, $(this), function () {}, true);
    });
}
function waitForEndLoad() {
    if (nbToLoad != ancNbToLoad) {
        ancNbToLoad = nbToLoad;
        tempMirrorListAll.sort(function (a, b) {
            var aname = formatMgName(a.name);
            var bname = formatMgName(b.name);
            if (aname == bname) {
                if (a.mirror == b.mirror)
                    return 0;
                else if (a.mirror > b.mirror)
                    return 1;
                else
                    return -1;
            } else {
                if (aname > bname)
                    return 1;
                else
                    return -1;
            }
        });
        var toDel = [];
        var prevName;
        var prevMirror;
        for (var k = 0; k < tempMirrorListAll.length; k++) {
            if (prevName !== undefined) {
                if (tempMirrorListAll[k].name == prevName && tempMirrorListAll[k].mirror == prevMirror) {
                    toDel[toDel.length] = k;
                }
            }
            prevName = tempMirrorListAll[k].name;
            prevMirror = tempMirrorListAll[k].mirror;
        }
        if (toDel.length > 0) {
            for (var i = toDel.length - 1; i >= 0; i--) {
                tempMirrorListAll.remove(toDel[i], toDel[i]);
            }
        }
        fillListOfSearchAll(tempMirrorListAll);
    }
    if (nbToLoad === 0) {
        localStorage["searchAll"] = JSON.stringify(tempMirrorListAll);
    } else {
        setTimeout(function () {
            waitForEndLoad();
        }, 500);
    }
}
function mangaListAllLoaded(mirror, lst) {
    for (var j = 0; j < lst.length; j++) {
        if (formatMgName(lst[j][0]).indexOf(formatMgName(curSearch)) != -1) {
            var obj = {};
            obj.url = lst[j][1];
            obj.name = lst[j][0];
            obj.mirror = mirror;
            tempMirrorListAll[tempMirrorListAll.length] = obj;
        }
    }
    $(".mirrorIcon img").each(function (index) {
        if ($(this).attr("title") == mirror) {
            $("img", $(this).closest("tr").next()).attr("src", chrome.extension.getURL("img/blue.png"));
        }
    });
    nbToLoad--;
}
