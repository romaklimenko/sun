/* global alert: true */
/* global Modernizr: true */
/* global Raphael: true */
/* global moment: true */

var latitude    = 55.6712673;
var longitude  = 12.5608388;
var dates;
var paper;
var i;

var address = "";

function initializeDates() {
  var year = new Date().getFullYear();
  var isLeap = new Date(year, 1, 29).getMonth() === 1;

  var count = isLeap ? 366 : 365;

  dates = [];

  for (i = 0; i < count; i++) {
    dates.push(moment().startOf("year").add(i, "d"));
  }
}

function renderInformers() {
  var yesterday = moment().add(-1, "d")._d;
  var yesterdaySunrise = yesterday.sunrise(latitude, longitude);
  var yesterdaySunset = yesterday.sunset(latitude, longitude);
  var yesterdayDuration = moment.duration(yesterdaySunset - yesterdaySunrise).asMinutes();

  var today = new Date();
  var todaySunrise = today.sunrise(latitude, longitude);
  var todaySunset = today.sunset(latitude, longitude);
  var todayDuration = moment.duration(todaySunset - todaySunrise).asMinutes();

  var tomorrow = moment().add(1, "d")._d;
  var tomorrowSunrise = tomorrow.sunrise(latitude, longitude);
  var tomorrowSunset = tomorrow.sunset(latitude, longitude);
  var tomorrowDuration = moment.duration(tomorrowSunset - tomorrowSunrise).asMinutes();

  $("#yesterday").html(
    "Yesterday was " +
    Math.abs(Math.round(yesterdayDuration - todayDuration)) + " minutes " +
    ((yesterdayDuration > todayDuration) ? " longer &uarr;" : "shorter &darr;" ));

  $("#today").html(
    "Today, at " + address + ", sunrise at " +
    moment(todaySunrise).format("HH:mm") +
    " and sunset at " +
    moment(todaySunset).format("HH:mm"));

  $("#tomorrow").html(
    "Tomorrow will be " +
    Math.abs(Math.round(todayDuration - tomorrowDuration)) + " minutes " +
    ((tomorrowDuration > todayDuration) ? " longer &uarr;" : "shorter &darr;" ));
}

function renderPaper() {
  $("#paper").height($(window).height() - $("header").height() - 70);

  $("#paper").html("");

  paper = new Raphael("paper", $("#paper").width(), $("#paper").height());
}

function renderSunriseAndSunset() {

  function getX(dayIndex) {
    return dayIndex * pxPerDay;
  }

  function getY(date) {
    return (date.getHours() * 60 + date.getMinutes()) * pxPerMinute;
  }

  var height = $("#paper").height();
  var width = $("#paper").width();

  var pxPerDay = width / (dates.length - 1);
  var pxPerMinute = height / (24 * 60);
  var pxPerHour = height / 24;

  var pathArray = [];

  var months = [
    "Jan", "Feb",
    "Mar", "Apr", "May",
    "Jun", "Jul", "Aug",
    "Sep", "Oct", "Nov",
    "Dec"
  ];

  for (i = 0; i < 24; i++) {
    paper
      .path(["M", 0, pxPerHour * i, "L", width, pxPerHour * i])
      .attr({ stroke: "#93a1a1" });

    paper
      .text(15, pxPerHour * i + (pxPerHour / 2), i + ":00")
      .attr({fill: "#93a1a1"});
  }

  paper
    .path(["M", 0, height - 1, "L", width, height - 1])
    .attr({ stroke: "#93a1a1" });

  for (i = 0; i < dates.length; i++) {
    var date = dates[i]._d;

    if (i !== 0 && date.getDate() === 1) {
      paper
        .path(["M", getX(i), 0, "L", getX(i), height])
        .attr({ stroke: "#93a1a1" });
    }
    else if (date.getDate() === 15) {
      paper
        .text(getX(i), 10, months[date.getMonth()])
        .attr({fill: "#93a1a1"});
    }

    if (i === 0) {
      pathArray = pathArray.concat(
        ["M", getX(i), getY(date.sunrise(latitude, longitude))]);
    }
    else {
      pathArray = pathArray.concat(
        ["L", getX(i), getY(date.sunrise(latitude, longitude))]);
    }
  }

  for (i = dates.length - 1; i >= 0; i--) {
    pathArray = pathArray.concat(
      ["L", getX(i), getY(dates[i]._d.sunset(latitude, longitude))]);
  }

  pathArray = pathArray.concat(["Z"]);

  paper.path().attr({
    fill: "#fdf6e3",
    "fill-opacity": 0.5,
    path: pathArray,
    stroke: "#657b83"
  });

  // you are here
  var now = new Date();

  paper
    .path(["M", 0, getY(now), "L", width, getY(now)])
    .attr({ stroke: "#cb4b16" });

  paper
    .circle((moment(now).dayOfYear() - 1) * pxPerDay, getY(now), 5)
    .attr({fill: "#FFFF00", stroke: "#cb4b16"});
}

function reset() {
  initializeDates();
  renderInformers();
  renderPaper();
  renderSunriseAndSunset();
}

function initializeLocation() {

  function set_location(position) {
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;

    if (address === "") {
      address = latitude + ", " + longitude;
    }

    $.ajax({
      url: "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + latitude + "," + longitude
    }).done(function(result) {
      address = result.results[0].formatted_address;
      reset();
    });

    reset();
  }

  if (Modernizr.geolocation) {
    navigator.geolocation.getCurrentPosition(set_location);
  } else {
    alert("Can't get location :(");
  }
}

initializeLocation();

reset();

$(window).resize(function() {
  reset();
});

setInterval( function() { reset(); }, 60000 );
