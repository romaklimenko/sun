/* global Raphael: true */

// København 55.6712673,12.5608388
// Dnipropetrovsk 48.4622985,35.0003565

var latitude0 = 55.6712673;
var longtitude0 = 12.5608388;

var latitude1 = 48.4622985;
var longtitude1 = 35.0003565;

var year = new Date().getFullYear();
var date = new Date(year, 0, 1);

var dates = [];

while (date.getFullYear() === year) {
  dates.push(new Date(date));
  date.setDate(date.getDate() + 1);
}

var paperElement = document.getElementById("paper");

var width = paperElement.clientWidth;
var height = paperElement.clientHeight;

var paper = new Raphael("paper", width, height);

var pxPerDay = width / dates.length;
var pxPerMinute = height / (24 * 60);

function getX(dayIndex) {
  return dayIndex * pxPerDay;
}

function getY(date) {
  return (date.getHours() * 60 + date.getMinutes()) * pxPerMinute;
}

for (var i = dates.length - 1; i >= 0; i--) {
  var sunrise = dates[i].sunrise(latitude0, longtitude0);
  var sunset = dates[i].sunset(latitude0, longtitude0);
  sunrise.setTime(sunrise.getTime() - 1 * 60 * 60 * 1000);
  sunset.setTime(sunset.getTime() - 1 * 60 * 60 * 1000);
  paper.circle(getX(i), getY(sunrise), 1).attr({fill: "#FF0000", stroke: "#FF0000"});
  paper.circle(getX(i), getY(sunset), 1).attr({fill: "#FF0000", stroke: "#FF0000"});
}

for (var i = dates.length - 1; i >= 0; i--) {
  var sunrise = dates[i].sunrise(latitude1, longtitude1);
  var sunset = dates[i].sunset(latitude1, longtitude1);
  paper.circle(getX(i), getY(sunrise), 1).attr({fill: "#0000FF", stroke: "#0000FF"});
  paper.circle(getX(i), getY(sunset), 1).attr({fill: "#0000FF", stroke: "#0000FF"});
}