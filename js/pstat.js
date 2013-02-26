var mirrors;
var stats = [];
var mangas = [];
var months = [];
var days = [];
var websites = [];
var mustloadperday = true;
var mustloadpermonth = true;
var monthsNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

$(function () {
    loadMenu("stats");
    $("#histo").show();
    $("#histo .article").show();
    mirrors = chrome.extension.getBackgroundPage().mirrors;
    chrome.extension.getBackgroundPage().pstat.webdb.getAllPStat(function (tx, res) {
        if (res.rows.length > 0) {
            $("#allstats").show();
			var i = 0;
            for (i; i < res.rows.length; i += 1) {
                stats[stats.length] = {
                    mirror : res.rows.item(i).mirror,
                    mgname : res.rows.item(i).mgname,
                    mgurl : res.rows.item(i).mgurl,
                    chapname : res.rows.item(i).chapname,
                    chaptext : res.rows.item(i).chaptext,
                    time_spent : res.rows.item(i).time_spent,
                    added_on : res.rows.item(i).added_on,
                    id : res.rows.item(i).ID
                }
            }
            stats.sort(function (a, b) {
                return (a.added_on < b.added_on) ? 1 : ((a.added_on == b.added_on) ? 0 : -1);
            });
            renderMg();
            renderTot();
            renderTable();
        } else {
            $("#nostat").show();
            $("#nostat .article").show();
            $("#allstats").hide();
        }
    });
});

function renderTot() {
    $(".totstats tbody").empty();
    var totTime = 0;
    var avgmonth = 0;
    var avgday = 0;
    var avgmonthnb = 0;
    var avgdaynb = 0;
    var avgchap = 0;
    var mostmgtime,
    mostmgch,
    mostws;
    for (var i = 0; i < mangas.length; i += 1) {
        totTime += mangas[i].time;
        if (!mostmgtime || mostmgtime.time < mangas[i].time)
            mostmgtime = mangas[i];
        if (!mostmgch || mostmgch.nb < mangas[i].nb)
            mostmgch = mangas[i];
    }
    for (var i = 0; i < months.length; i += 1) {
        avgmonth += months[i].time;
        avgmonthnb += months[i].nb;
    }
    avgmonth = Math.ceil(avgmonth / months.length);
    avgmonthnb = avgmonthnb / months.length;
    for (var i = 0; i < days.length; i += 1) {
        avgday += days[i].time;
        avgdaynb += days[i].nb;
    }
    avgday = Math.ceil(avgday / days.length);
    avgdaynb = avgdaynb / days.length;
    for (var i = 0; i < stats.length; i += 1) {
        avgchap += stats[i].time_spent;
    }
    avgchap = Math.ceil(avgchap / stats.length);
    for (var i = 0; i < websites.length; i += 1) {
        if (!mostws || mostws.nb < websites[i].nb)
            mostws = websites[i];
    }
    $("<tr class='odd'><td>Total time spent reading mangas</td><td class='times'>" + getTimespent(totTime) + "</td></tr>").appendTo($(".totstats tbody"));
    $("<tr class='even'><td>Number of mangas read</td><td class='times'>" + mangas.length + "</td></tr>").appendTo($(".totstats tbody"));
    $("<tr class='odd'><td>Number of chapters read</td><td class='times'>" + stats.length + "</td></tr>").appendTo($(".totstats tbody"));
    $("<tr class='even'><td>Average chapters read per day</td><td class='times'>" + formatNum2Dig(avgdaynb) + "</td></tr>").appendTo($(".totstats tbody"));
    $("<tr class='odd'><td>Average time spent per day reading manga</td><td class='times'>" + getTimespent(avgday) + "</td></tr>").appendTo($(".totstats tbody"));
    $("<tr class='even'><td>Average chapters read per month</td><td class='times'>" + formatNum2Dig(avgmonthnb) + "</td></tr>").appendTo($(".totstats tbody"));
    $("<tr class='odd'><td>Average time spent per month reading manga</td><td class='times'>" + getTimespent(avgmonth) + "</td></tr>").appendTo($(".totstats tbody"));
    $("<tr class='even'><td>Average time spend to read a chapter</td><td class='times'>" + getTimespent(avgchap) + "</td></tr>").appendTo($(".totstats tbody"));
    $("<tr class='odd'><td>Most read manga (number of chapters)</td><td class='times'>" + mostmgch.name + " (" + mostmgch.nb + ")" + "</td></tr>").appendTo($(".totstats tbody"));
    $("<tr class='even'><td>Most read manga (time spent)</td><td class='times'>" + mostmgtime.name + " (" + getTimespent(mostmgtime.time) + ")" + "</td></tr>").appendTo($(".totstats tbody"));
    $("<tr class='odd'><td>Most read website</td><td class='times'>" + "<img src='" +
        chrome.extension.getURL(getMangaMirror(mostws.text).mirrorIcon) +
        "'/>&nbsp;" + mostws.text + "</td></tr>").appendTo($(".totstats tbody"));

}

function formatNum2Dig(num) {
    return Math.round(num * 100) / 100;
}
function formatMonth(time) {
    var dt = new Date(time);
    var m = dt.getMonth();
    if (m < 10) {
        m = "0" + m;
    } else {
        m = "" + m;
    }
    return dt.getFullYear() + "/" + m;
}
function formatDay(time) {
    var dt = new Date(time);
    var m = dt.getMonth();
    if (m < 10) {
        m = "0" + m;
    } else {
        m = "" + m;
    }
    var d = dt.getDate();
    if (d < 10) {
        d = "0" + d;
    } else {
        d = "" + d;
    }
    return dt.getFullYear() + "/" + m + "/" + d;
}
function renderMg() {
    mangas = [];
    months = [];
    days = [];
    websites = [];
    var minday,
    maxday;
    var minmth,
    maxmth;
    $(".mangastats tbody").empty();
    for (var i = 0; i < stats.length; i += 1) {
        var found = false;
        for (var j = 0; j < mangas.length; j++) {
            if (formatMgName(mangas[j].name) == formatMgName(stats[i].mgname)) {
                found = true;
                mangas[j].nb++;
                mangas[j].time += stats[i].time_spent;
                break;
            }
        }
        if (!found) {
            mangas[mangas.length] = {
                name : stats[i].mgname,
                nb : 1,
                time : stats[i].time_spent
            };
        }
        found = false;
        for (var j = 0; j < months.length; j++) {
            if (months[j].text == formatMonth(stats[i].added_on)) {
                found = true;
                months[j].nb++;
                months[j].time += stats[i].time_spent;
                break;
            }
        }
        if (!found) {
            if (!minmth || minmth > formatMonth(stats[i].added_on))
                minmth = formatMonth(stats[i].added_on);
            if (!maxmth || maxmth < formatMonth(stats[i].added_on))
                maxmth = formatMonth(stats[i].added_on);

            months[months.length] = {
                text : formatMonth(stats[i].added_on),
                nb : 1,
                time : stats[i].time_spent
            };
        }
        found = false;
        for (var j = 0; j < days.length; j++) {
            if (days[j].text == formatDay(stats[i].added_on)) {
                found = true;
                days[j].nb++;
                days[j].time += stats[i].time_spent;
                break;
            }
        }
        if (!found) {
            if (!minday || minday > formatDay(stats[i].added_on))
                minday = formatDay(stats[i].added_on);
            if (!maxday || maxday < formatDay(stats[i].added_on))
                maxday = formatDay(stats[i].added_on);

            days[days.length] = {
                text : formatDay(stats[i].added_on),
                nb : 1,
                time : stats[i].time_spent
            };
        }
        found = false;
        for (var j = 0; j < websites.length; j++) {
            if (websites[j].text == stats[i].mirror) {
                found = true;
                websites[j].nb++;
                websites[j].time += stats[i].time_spent;
                break;
            }
        }
        if (!found) {
            websites[websites.length] = {
                text : stats[i].mirror,
                nb : 1,
                time : stats[i].time_spent
            };
        }
    }
    if (minday && maxday) {
        var mindate = new Date(
                parseInt(minday.substr(0, 4), 10),
                parseInt(minday.substr(5, 2), 10),
                parseInt(minday.substr(8, 2), 10)).getTime();
        var maxdate = new Date(
                parseInt(maxday.substr(0, 4), 10),
                parseInt(maxday.substr(5, 2), 10),
                parseInt(maxday.substr(8, 2), 10)).getTime();
        while (mindate < maxdate) {
            var found = false;
            for (var j = 0; j < days.length; j++) {
                if (days[j].text == formatDay(mindate)) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                days[days.length] = {
                    text : formatDay(mindate),
                    nb : 0,
                    time : 0
                };
            }
            mindate += 86400 * 1000;
        }
    }
    days.sort(function (a, b) {
        return (a.text < b.text) ? -1 : ((a.text == b.text) ? 0 : 1);
    });
    if (minmth && maxmth) {
        var minmonth = new Date(
                parseInt(minday.substr(0, 4), 10),
                parseInt(minday.substr(5, 2), 10),
                1).getTime();
        var maxmonth = new Date(
                parseInt(maxday.substr(0, 4), 10),
                parseInt(maxday.substr(5, 2), 10),
                1).getTime();
        while (minmonth < maxmonth) {
            var found = false;
            for (var j = 0; j < months.length; j++) {
                if (months[j].text == formatMonth(minmonth)) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                months[months.length] = {
                    text : formatMonth(minmonth),
                    nb : 0,
                    time : 0
                };
            }
            minmonth = new Date(new Date(minmonth).getFullYear(), new Date(minmonth).getMonth() + 1, 1).getTime();
        }
    }
    months.sort(function (a, b) {
        return (a.text < b.text) ? -1 : ((a.text == b.text) ? 0 : 1);
    });
    mangas.sort(function (a, b) {
        return (a.name < b.name) ? -1 : ((a.name == b.name) ? 0 : 1);
    });
    $(".mgstats").empty();
    $(".mgstats").change(function () {
        renderTable()
    });
    $("<option value=\"\">All mangas</option>").appendTo($(".mgstats"));
    for (var i = 0; i < mangas.length; i += 1) {
        $("<tr class='" + ((i % 2 == 0) ? "odd" : "even") + "'><td>" +
            mangas[i].name + "</td><td class='times'>" +
            mangas[i].nb + "</td><td class='times'>" +
            getTimespent(mangas[i].time) + "</td></tr>").appendTo($(".mangastats tbody"));
        $("<option value='" + mangas[i].name + "'>" + mangas[i].name + "</option>").appendTo($(".mgstats"));
    }
}

function renderTable() {
    $(".stats tbody").empty();
    for (var i = 0; i < stats.length; i += 1) {
        var display = true;

        if ($(".mgstats option:selected").val() != "" && formatMgName($(".mgstats option:selected").val()) != formatMgName(stats[i].mgname)) {
            display = false;
        }
        if (display) {
            var tr = $("<tr class='" + ((i % 2 == 0) ? "odd" : "even") + "'><td><img src='" +
                    chrome.extension.getURL(getMangaMirror(stats[i].mirror).mirrorIcon) +
                    "'/></td><td><a class='link' onclick=\"openTab('" + stats[i].mgurl + "');\">" +
                    stats[i].mgname + "</a></td><td><a class='link' onclick=\"openTab('" +
                    stats[i].chaptext + "');\">" + stats[i].chapname + "</a></td><td>" +
                    prettyDate(stats[i].added_on) + "</td><td class='times'>" +
                    getTimespent(stats[i].time_spent) + "</td><td class='buttontd'><img class='deleteline' src='img/delete10.png' /></td></tr>");
            tr.data("id", stats[i].id);
            tr.appendTo($(".stats tbody"));
        }
    }
    $(".deleteline").unbind("click");
    $(".deleteline").click(function () {
        var curid = $(this).closest("tr").data("id");
        chrome.extension.getBackgroundPage().pstat.webdb.deleteStat(curid, function () {
            var entry = -1;
            for (var i = 0; i < stats.length; i += 1) {
                if (stats[i].id == curid) {
                    entry = i;
                }
            }
            if (entry != -1) {
                stats.remove(entry, entry);
                renderMg();
                renderTot();
                renderTable();
            }
        });
    });
}

function getTimespent(time) {
    time = Math.ceil(time / 1000);
    return (
        time < 60 && time + " sec" ||
        time < 120 && "1 min" ||
        time < 3600 && Math.floor(time / 60) + " min " + (time - (Math.floor(time / 60) * 60)) + " sec" ||
        time < 7200 && "1 hour " + Math.floor((time - (Math.floor(time / 3600) * 3600)) / 60) + " min" ||
        time < 86400 && Math.floor(time / 3600) + " hours " + Math.floor((time - (Math.floor(time / 3600) * 3600)) / 60) + " min");
}
function openTab(url) {
    window.open(url);
}
function formatMgName(name) {
    if (name == undefined || name == null || name == "null")
        return "";
    return name.trim().replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

function getMangaMirror(mirror) {
    for (var i = 0; i < mirrors.length; i += 1) {
        if (mirrors[i].mirrorName == mirror) {
            return mirrors[i];
        }
    }
    return null;
}

function prettyDate(time) {
    var diff = ((new Date().getTime() - time) / 1000);
    var day_diff = Math.floor(diff / 86400);

    if (isNaN(day_diff) || day_diff < 0 || day_diff >= 31) {
        return;
    }

    return day_diff == 0 && (
        diff < 60 && "just now" ||
        diff < 120 && "1 minute ago" ||
        diff < 3600 && Math.floor(diff / 60) + " minutes ago" ||
        diff < 7200 && "1 hour ago" ||
        diff < 86400 && Math.floor(diff / 3600) + " hours ago") ||
    day_diff == 1 && "Yesterday" ||
    day_diff < 7 && day_diff + " days ago" ||
    day_diff < 31 && Math.ceil(day_diff / 7) + " weeks ago";
}

function switchOnglet(ong, tab) {
    $(".tab").removeClass("checked");
    $(ong).addClass("checked");
    $(".ongletCont").each(function (index) {
        if ($(this).attr("id") == tab) {
            $(this).show();
            $(".article", $(this)).show();
        } else {
            $(this).hide();
        }
    });
}
google.load("language", "1");
google.load("visualization", "1", {
    packages : ["corechart"]
});
google.setOnLoadCallback(readyG);

function readyG() {}
function loadPerDay() {
    if (mustloadperday) {
        drawPerDay();
    }
}

function drawPerDay() {
    var data = new google.visualization.DataTable();
    data.addColumn('date', 'Date');
    data.addColumn('number', 'Chapters read');
    data.addRows(days.length);

    for (var i = 0; i < days.length; i += 1) {
        var dt = new Date(
                parseInt(days[i].text.substr(0, 4), 10),
                parseInt(days[i].text.substr(5, 2), 10),
                parseInt(days[i].text.substr(8, 2), 10));
        data.setValue(i, 0, dt);
        data.setValue(i, 1, days[i].nb);
    }

    var dataView = new google.visualization.DataView(data);
    dataView.setColumns([{
                calc : function (dt, row) {
                    return dt.getFormattedValue(row, 0);
                },
                type : 'string'
            }, 1]);

    var chart = new google.visualization.ColumnChart(document.getElementById('per_day_div'));
    chart.draw(dataView, {
        title : 'Manga read per day'
    });

    var datat = new google.visualization.DataTable();
    datat.addColumn('date', 'Date');
    datat.addColumn('number', 'Time spent');
    datat.addRows(days.length);

    for (var i = 0; i < days.length; i += 1) {
        var dt = new Date(
                parseInt(days[i].text.substr(0, 4), 10),
                parseInt(days[i].text.substr(5, 2), 10),
                parseInt(days[i].text.substr(8, 2), 10));
        datat.setValue(i, 0, dt);
        datat.setValue(i, 1, days[i].time / 1000);
        datat.setFormattedValue(i, 1, getTimespent(days[i].time));
    }

    var dataViewt = new google.visualization.DataView(datat);
    dataViewt.setColumns([{
                calc : function (dt, row) {
                    return dt.getFormattedValue(row, 0);
                },
                type : 'string'
            },
            1]);

    var chartt = new google.visualization.ColumnChart(document.getElementById('per_day_time_div'));
    chartt.draw(dataViewt, {
        title : 'Time spent per day'
    });
}

function loadPerMonth() {
    if (mustloadpermonth) {
        drawPerMonth();
    }
}

function drawPerMonth() {
    var data = new google.visualization.DataTable();
    data.addColumn('date', 'Date');
    data.addColumn('number', 'Chapters read');
    data.addRows(months.length);

    for (var i = 0; i < months.length; i += 1) {
        var dt = new Date(
                parseInt(months[i].text.substr(0, 4), 10),
                parseInt(months[i].text.substr(5, 2), 10),
                1);
        data.setValue(i, 0, dt);
        data.setValue(i, 1, months[i].nb);
    }

    var dataView = new google.visualization.DataView(data);
    dataView.setColumns([{
                calc : function (dt, row) {
                    return monthsNames[dt.getValue(row, 0).getMonth()] + " " + dt.getValue(row, 0).getFullYear();
                },
                type : 'string'
            }, 1]);

    var chart = new google.visualization.ColumnChart(document.getElementById('per_month_div'));
    chart.draw(dataView, {
        title : 'Manga read per month'
    });

    var datat = new google.visualization.DataTable();
    datat.addColumn('date', 'Date');
    datat.addColumn('number', 'Time spent');
    datat.addRows(months.length);

    for (var i = 0; i < months.length; i += 1) {
        var dt = new Date(
                parseInt(months[i].text.substr(0, 4), 10),
                parseInt(months[i].text.substr(5, 2), 10),
                1);
        datat.setValue(i, 0, dt);
        datat.setValue(i, 1, months[i].time / 1000);
        datat.setFormattedValue(i, 1, getTimespent(months[i].time));
    }

    var dataViewt = new google.visualization.DataView(datat);
    dataViewt.setColumns([{
                calc : function (dt, row) {
                    return monthsNames[dt.getValue(row, 0).getMonth()] + " " + dt.getValue(row, 0).getFullYear();
                },
                type : 'string'
            },
            1]);

    var chartt = new google.visualization.ColumnChart(document.getElementById('per_month_time_div'));
    chartt.draw(dataViewt, {
        title : 'Time spent per month'
    });
}
document.getElementById("history").addEventListener(“click”,switchOnglet(this, 'histo'));
document.getElementById("day").addEventListener(“click”,switchOnglet(this, 'perday');loadPerDay(););
document.getElementById("month").addEventListener(“click”,switchOnglet(this, 'permonth');loadPerMonth(););
