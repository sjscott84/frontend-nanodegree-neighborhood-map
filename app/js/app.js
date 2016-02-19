'use strict';
var map,
	view,
	startPoint = {lat:37.773972, lng: -122.431297},
	infowindow,
	yelpData,
	googleData = [],
	overlay = document.getElementById('googleOverlay'),
	labels = 'BCDEFGHIJKLMNOPQRSTUVWXYZ',
	labelIndex = 0,
	vicinity,
	cll,
	initialLocation;

/**
 * Add google maps to screen with search box
*/
function initMap(){

	map = new google.maps.Map(document.getElementById('map'),{
		center: startPoint,
		zoom: 12,
		mapTypeControl: false,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	});

	infowindow = new google.maps.InfoWindow;

	//view.findLocation();//this functionality turned off to meet project requirement for search capabilities
	view.addSearch();

	//Adds legend to different part of screen depending on screen size
	if ( $(window).width() > 600) {
		map.controls[google.maps.ControlPosition.LEFT_TOP].push(overlay);
	}else {
		map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(overlay);
	}

	if (localStorage.getItem("results") !== null) {
		view.getInfo();
		vicinity = view.listView()[0].vicinity;
		cll = view.listView()[0].position.lat+','+view.listView()[0].position.lng;
		map.setZoom(14);
		map.setCenter(view.listView()[0].position);
		view.showResults();
	}

}

/**
 * The starting position for any directions
 * @param {string} name - The name of the starting place
 * @param {object} position - The latitude and longitude of the starting place
 * @param {string} vicinity - A formatted address for the starting place
*/
var StartPlace = function(name, position, vicinity){
	this.map = map;
	this.name = name;
	this.position = position;
	this.vicinity = vicinity;
	this.marker = new google.maps.Marker({
		map: map,
		title: name,
		icon: 'http://maps.gstatic.com/mapfiles/markers2/marker_greenA.png',
		position: this.position
	});
	this.listName = "A - "+name;
};

/**
 * The place object for the results returned from yelp or google
 * @param {string} name - The name of the place
 * @param {object} position - The latitude and longitude of the place
 * @param {number} rating - The rating of the place
 * @param {string} what - The catagory of the place e.g "Art Gallery"
 * @param {url} url - The URL to the yelp page of place (only supplied when info comes from yelp api and not google api)
 */
var Place = function(name, position, rating, what, url){
	this.map = map;
	this.name = name;
	this.position = position;
	this.rating = rating;
	this.what = what;
	this.url = url;
	this.marker = new google.maps.Marker({
		map: map,
		title: name,
		position: this.position,
		label: labels[labelIndex++ % labels.length],
		zoomOnClick: false,
		animation: google.maps.Animation.DROP
	});
	google.maps.event.addListener(this.marker, 'click', function() {
		this.icon = 'http://maps.gstatic.com/mapfiles/markers2/marker_green'+this.label+'.png';
		view.showFullLegend();
		view.getDirections(position, name, this, rating, what, url);
	});

	this.listName = this.marker.label+" - "+name;
};

/**
 * View model for website
 */
var ViewModel = function(){
	var self = this,
		searchBox,
		places,
		directionsDisplay,
		directionsService;

	self.showOptions = ko.observable(true);
	self.showLegend = ko.observable(false);
	self.showDirections = ko.observable(false);
	self.listView = ko.observableArray([]);
	self.currentPlace = ko.observable();
	self.dataType = ko.observableArray(["All"]);
	self.showFilter = ko.observable(false);
	self.currentFilter = ko.observable();

	//this functionality turned off to meet project requirement for search capabilities
	/**
	 * Use W3C Geolocation to find users current position
	 */
	self.findLocation = function(){
		var browserSupportFlag =  new Boolean();
		var initialLocation;
		var geocoder = new google.maps.Geocoder;

		directionsDisplay = new google.maps.DirectionsRenderer();
		directionsService = new google.maps.DirectionsService();

		// Try W3C Geolocation (Preferred)
		if(navigator.geolocation) {
			browserSupportFlag = true;
			navigator.geolocation.getCurrentPosition(function(position) {
				cll = position.coords.latitude+','+position.coords.longitude;
				initialLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
				map.setCenter(initialLocation);
				geocodeLatLng(initialLocation);
				self.addStartPlace("Starting Point", initialLocation, vicinity);
			}, function() {
				handleNoGeolocation(browserSupportFlag);
			});
		}
		// If browser doesn't support Geolocation
		else {
			browserSupportFlag = false;
			handleNoGeolocation(browserSupportFlag);
		}
		// Handle erros
		function handleNoGeolocation(errorFlag) {
			if (errorFlag === true) {
				alert("Geolocation service failed, enter your starting location in the search field in the map");
				map.setCenter(startPoint);
			} else {
				alert("Geolocation service failed, enter your starting location in the search field in the map");
				map.setCenter(startPoint);
			}
		}

		function geocodeLatLng(where){
			var latlng = where;
			geocoder.geocode({'location': latlng}, function(results, status){
				if (status === google.maps.GeocoderStatus.OK) {
					if (results[1]) {
						vicinity = results[1].formatted_address;
					} else {
					window.alert('No results found');
					}
				} else {
					window.alert('Geocoder failed due to: ' + status);
				}
			});
		}
	};

	/**
	 * Search box, used to find starting point for place searches if unable to use geolocation
	 */
	self.addSearch = function (){
		// Create the search box and link it to the UI element.
		var input = document.getElementById('pac-input');
		searchBox = new google.maps.places.SearchBox(input);
		var bounds = new google.maps.LatLngBounds();
		map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

		//Bias the SearchBox results towards current map's viewport.
		map.addListener('bounds_changed', function() {
			searchBox.setBounds(map.getBounds());
		});

		directionsDisplay = new google.maps.DirectionsRenderer();
		directionsService = new google.maps.DirectionsService();

		// Listen for the event fired when the user selects a prediction,
		// removes any existing search history and
		// retrieves more details for that place.
		searchBox.addListener('places_changed', function() {
			places = searchBox.getPlaces();
			if (places.length === 0) {
				return;
			}
			//if (self.listView().length > 0){
				for (var i = 0; i < self.listView().length; i++) {
					self.listView()[i].marker.setMap(null);
				}
				directionsDisplay.setMap(null);
				directionsDisplay.setPanel(null);
				labels[labelIndex=0];
				self.showCatagories();
				self.listView([]);
				yelpData = {};
				googleData = [];
				self.dataType(["All"]);
			//}
			places.forEach(function(place) {
				var name = place.name;
				var position = place.geometry.location;
				vicinity = place.formatted_address;
				cll = place.geometry.location.lat()+','+place.geometry.location.lng();
				initialLocation = new google.maps.LatLng(place.geometry.location.lat(),place.geometry.location.lng());

				self.addStartPlace(name, position, vicinity);

				if (place.geometry.viewport) {
				// Only geocodes have viewport.
					bounds.union(place.geometry.viewport);
				} else {
					bounds.extend(place.geometry.location);
				}

				map.fitBounds(bounds);
				map.setZoom(14);
				bounds = new google.maps.LatLngBounds();
			});
		});
	};

	/**
	 * Defines types for the findThings function to search weather results come from yelp api or google places api
	 * Input is the catagories radio
	 */
	self.seePlaces = function (){
		if(!self.listView()[0]){
			alert("Please enter a starting location");
		}else{
			var forSearchYelp;
			var forSearchGoogle = [];
			$('input[name="whatToDo"]:checked').each(function(){
				var input = this.value;
				switch (input) {
					case 'outdoors':
						forSearchGoogle = ['park', 'zoo'];
						forSearchYelp = 'parks,playgrounds,gardens,farms,observatories,beaches,hiking,horsebackriding,skatingrinks,swimmingpools,waterparks';
						break;
					case 'culture':
						forSearchGoogle = ['art_gallery', 'library', 'museum'];
						forSearchYelp = 'galleries,culturalcenter,museums,planetarium,wineries,landmarks,observatories';
						break;
					case 'amusement':
						forSearchGoogle = ['amusement_park', 'bowling_alley', 'museum'];
						forSearchYelp = 'museums,arcades,hauntedhouses,amusementparks,carousels,gokarts,mini_golf,skatingrinks';
						break;
					case 'animals':
						forSearchGoogle = ['aquarium', 'zoo'];
						forSearchYelp = 'aquariums,diving,fishing,horsebackriding,snorkeling,zoos';
						break;
				}
				yelpHell(forSearchYelp, vicinity, cll, forSearchGoogle, view);
			});
		}
	};

	/**
	 * Add a start place to an observable array
	 * @param {string} name - The name of the starting place
	 * @param {object} position - The latitude and longitude of the starting place
	 * @param {string} vicinity - A formatted address for the starting place
	 */
	self.addStartPlace = function (name, position, vicinity){
		self.listView.push(new StartPlace(name, position, vicinity));
	};

	/**
	 * Add a place to an observable array
	 * @param {string} name - The name of the place
	 * @param {object} position - The latitude and longitude of the place
	 * @param {number} rating - The rating of the place
	 * @param {string} what - The catagory of the place e.g "Art Gallery"
	 * @param {url} url - The URL to the yelp page of place (only supplied when info comes from yelp api and not google api)
	 */
	self.addPlace = function (name, position, rating, what, url){
		self.listView.push(new Place(name, position, rating, what, url));
	};

	/**
	 * Sets the current place to clicked list item
	 * @param {object} clickedPlace - The item from the self.filterView list that was clicked
	 */
	self.setPlace = function(clickedPlace){
		if(clickedPlace !== self.listView()[0]){
			self.currentPlace(clickedPlace);
			self.showFullLegend();
			self.getDirections(self.currentPlace().position, self.currentPlace().name, self.currentPlace().marker,
			self.currentPlace().rating, self.currentPlace().what, self.currentPlace().url);
		}
	};

	/**
	 * Search google places api by type if yelp api fails
	 * @param {array} what - An array of catagories for google to search for
	 */
	self.findThings = function (what){

		var service = new google.maps.places.PlacesService(map);

		//Gets a list of google places from a starting point
		function callback(results, status){
			if (status === google.maps.places.PlacesServiceStatus.OK) {
				for (var i = 0; i < results.length; i++) {
					var place = results[i];
					if(place.rating >= 3){
						var thePlace = { 
							name: place.name, 
							position: place.geometry.location, 
							type: place.types[0], 
							rating: place.rating, 
						};
						googleData.push(thePlace);
					}
				}
				//Return error message if no results
				if(googleData.length === 0){
					alert("There are no google results that match your search, please try a new starting point");
				}else{
					self.displayPlaces();
				}
			}
		}

		var seachNearByQuery = {
			location: self.listView()[0].position,
			//radius: '500',
			types: what,
			rankBy: google.maps.places.RankBy.DISTANCE
		};
		service.nearbySearch(seachNearByQuery, callback);
	};

	/**
	 * Sort through yelp or google data and display based on various catagories
	 */
	self.displayPlaces = function (){
		//adds google results to view.listView() if no yelp results
		if(yelpData === undefined || jQuery.isEmptyObject(yelpData)){
			for(var j = 0; j<googleData.length; j++){
				self.addPlace(googleData[j].name, googleData[j].position, googleData[j].rating, googleData[j].type);
			}
		}else{
			//adds yelp info to view.listView() if rating is over 3.5 and is open
			var yelp = yelpData.businesses;
			for(var i = 0; i<yelp.length; i++){
				if(yelp[i].rating >= 3.5 && !yelp[i].is_closed){
					try{
						var yelpLoc = new google.maps.LatLng(yelp[i].location.coordinate.latitude,yelp[i].location.coordinate.longitude);
						self.addPlace(yelp[i].name, yelpLoc, yelp[i].rating, yelp[i].categories[0][0], yelp[i].url);
					}catch(e){
						i++;
					}
				}
			}
		}

		//if no yelp results match search catagory return error message else save results to local storage
		if(self.listView().length === 1){
			alert("There are no results that match your search, try a new catagory");
		}else{
			self.showResults();
			localStorage.clear();
			self.saveInfo();
		}

		self.setDataTypeArray(self.listView());
	};

	/**
	 * Filter results by catagory
	 */
	self.filterView = ko.computed(function(){
		if(self.currentFilter() === "All"){
			for(var i = 0; i<self.listView().length; i++){
				self.listView()[i].marker.setMap(map);
				directionsDisplay.setMap(null);
				directionsDisplay.setPanel(null);
				infowindow.close();
			}
			return self.listView();
		}
		if (!self.currentFilter()) {
			return self.listView();
		} else {
			return ko.utils.arrayFilter(self.listView(), function (clickedFilter) {
				infowindow.close();
				directionsDisplay.setMap(null);
				directionsDisplay.setPanel(null);
				for (var i = 1; i < self.listView().length; i++) {
					if(self.listView()[i].what !== self.currentFilter()){
						self.listView()[i].marker.setMap(null);
					}else{
						self.listView()[i].marker.setMap(map);
					}
				}
				return clickedFilter.what == self.currentFilter();
			});
		}
	});

	/**
	 * set the current type filter
	 * @param {string} genre - Catagory to filter on
	 */
	self.filter = function (genre) {
		map.setCenter(initialLocation);
		map.setZoom(14);
		self.currentFilter(genre);
	};

	/**
	 * show directions legend
	 */
	self.showDetailedDirections = function (){
		self.showLegend(false);
		self.showDirections(true);
	};

	/**
	 * show the places legend
	 */
	self.showFullLegend = function (){
		self.showDirections(false);
		self.showLegend(true);
	};

	/**
	 * show catagory options
	 */
	self.showCatagories = function (){
		self.showOptions(true);
		self.showLegend(false);
		self.showFilter(false);
	};

	/**
	 * show results
	 */
	self.showResults = function (){
		self.showOptions(false);
		self.showLegend(true);
		self.showFilter(true);
	};

	/**
	 * Choose a new catagory to search by pressing back button from results
	 */
	self.showOptionsAgain = function (){
		map.setCenter(initialLocation);
		map.setZoom(14);
		if (self.listView().length > 1){
			for (var i = 1; i < self.listView().length; i++) {
				self.listView()[i].marker.setMap(null);
				directionsDisplay.setMap(null);
				directionsDisplay.setPanel(null);
			}
			while(self.listView().length > 1){
				self.listView().splice(1, 1);
			}
		}
		labels[labelIndex=0];
		yelpData = {};
		googleData = [];
		self.dataType(["All"]);
		console.log(self.listView());
		self.showCatagories();
	};

	/**
	 * Get google walking directions from starting point to current item
	 * @param {object} where - object containing latitude and longitude of place to get directions too
	 * @param {string} name - name of place
	 * @param {object} marker - the google marker of the place to get directions to
	 * @param {number} rating - rating of place to get directions to
	 * @param {string} what - catagory of place to get directions to
	 * @param {string} url - URL to yelp reviews (only provided when results come from yelp not google)
	 */
	self.getDirections = function (where, name, marker, rating, what, url){
		directionsDisplay.setMap(map);
		directionsDisplay.setOptions( { suppressMarkers: true } );
		directionsDisplay.setPanel(document.getElementById("directionsPanel"));

		var start = self.listView()[0].position;
		var end = where;
		var request = {
			origin:start,
			destination:end,
			travelMode: google.maps.TravelMode.WALKING
		};

		directionsService.route(request, function(result, status) {
			if (status == google.maps.DirectionsStatus.OK) {
				directionsDisplay.setDirections(result);
				var distance = result.routes[0].legs[0].distance.text;
				var duration = result.routes[0].legs[0].duration.text;
				self.showInfo(name, marker, rating, what, url, distance, duration);
			}
		});
	};

	/**
	 * Show infowindow box for the current item
	 * @param {object} where - object containing latitude and longitude of place to get directions too
	 * @param {object} marker - the google marker of the place to get directions to
	 * @param {number} rating - rating of place to get directions to
	 * @param {string} what - catagory of place to get directions to
	 * @param {string} url - URL to yelp reviews (only provided when results come from yelp not google)
	 * @param {string} distance - distance from starting point to current item from google
	 * @param {string} duration - how long it will take to get from starting point to current item from google
	 */
	self.showInfo = function (where, marker, rating, what, url, distance, duration){
		var contentStringYelp = '<b>'+where+'</b>'+'<br>Category: '+what+'<br>Yelp Rating: '+rating
		+'<br><a href="'+url+'" target="_blank">Go to Yelp Reviews</a><br>Walk Time: '+distance+' about '+duration
		+'<br><button type="button" class="btn btn-default center-block" onclick="view.showDetailedDirections()">Show Directions!</button>';
		var contentStringGoogle = '<b>'+where+'</b>'+'<br>Category: '+what+'<br>Google Rating: '+rating+'<br>Walk Time: '+distance
		+' about '+duration+'<br><button type="button" class="btn btn-default center-block" onclick="view.showDetailedDirections()">Show Directions!</button>';

		infowindow.close();

		if(url){
			infowindow = new google.maps.InfoWindow({
				content: contentStringYelp
			});
		}else{
			infowindow = new google.maps.InfoWindow({
				content: contentStringGoogle
			});
		}

		infowindow.open(map, marker);
	};

	/**
	 * Save the current starting place and place results to local storage
	 */
	self.saveInfo = function (){
		var infoToSave = [];

		infoToSave.push({name: self.listView()[0].name, position: self.listView()[0].position, vicinity: self.listView()[0].vicinity});

		for(var i = 1; i<self.listView().length; i++){
			infoToSave.push({name: self.listView()[i].name, position: self.listView()[i].position, rating: self.listView()[i].rating,
			what: self.listView()[i].what, url: self.listView()[i].url});
		}

		localStorage.setItem("results", JSON.stringify(infoToSave));
		localStorage.setItem("initialLocation", JSON.stringify(initialLocation));
	};

	/**
	 * Retrieve infomation from local storage
	 */
	self.getInfo = function (){
		self.listView([]);
		var resultsFromLocalStorage = localStorage.getItem("results");
		var resultsToUse = JSON.parse(resultsFromLocalStorage);
		var initLocation = localStorage.getItem("initialLocation");
		initialLocation = JSON.parse(initLocation);
		labels[labelIndex=0];

		self.addStartPlace(resultsToUse[0].name, resultsToUse[0].position, resultsToUse[0].vicinity);

		for(var i = 1; i<resultsToUse.length; i++){
			self.addPlace(resultsToUse[i].name, resultsToUse[i].position, resultsToUse[i].rating, resultsToUse[i].what, resultsToUse[i].url);
		}

		self.setDataTypeArray(resultsToUse);
	};

	/**
	 * Creates the dataType array to filter results on
	 * @param {array} what - array to get catagory types from
	 */
	self.setDataTypeArray = function (what){
		for(var i = 1; i<what.length; i++){
			if(jQuery.inArray(what[i].what, self.dataType()) === -1){
				self.dataType.push(what[i].what);
			}
		}
	};

	/**
	 * Moves legend on screen resize to make site responsive
	 */
	self.changePositionOfLegend = function (){
		var left = google.maps.ControlPosition.LEFT_TOP;
		var bottom = google.maps.ControlPosition.BOTTOM_CENTER;

		if( $(window).width() < 600 && map.controls[left].length === 1){
			map.controls[left].clear();
			map.controls[bottom].push(overlay);
			map.setCenter(initialLocation);
		}else if( $(window).width() > 600 && map.controls[bottom].length === 1){
			map.controls[bottom].clear();
			map.controls[left].push(overlay);
			map.setCenter(initialLocation);
		}

	};

};

view = new ViewModel();

window.addEventListener("resize", view.changePositionOfLegend);

ko.applyBindings(view);