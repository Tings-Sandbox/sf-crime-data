var controlsModule = (function(window,$){
    
	/*Global variables within the module scope*/
    var _controlBarContainer;
	var _controlBarLowerContainer;
	var _table;
    var _options = {
	    "startDate": null,
		"endDate": null
	};
	
    /**
      * @param {object} domContainer
    */		
	function _init(domContainer, domContainer2){
	
	    //Initialize the module here
		if(!!domContainer){
		    //Yeah - it does exist
			_controlBarContainer = domContainer;

			_setDataUpdated();

            //Wire events
			$('.typeahead').typeahead({
				source: function (query, process) {
					addresses = [];
					resourcesModule.getAutoSuggestionsFromService(query, function(data){
						$.each(data, function (i, address) {
							addresses.push(address.text);
						});
						process(addresses);
					});
				},
				updater: function(item) {
					clickedIndex = $('.typeahead').find('.active').index();
					controlsModule.setSuggestionsListContent(clickedIndex);
					return item;
				},
				minLength: 4, items: 10
			});


            _controlBarContainer.find('#range-slider').noUiSlider({
                start: [1320],
                step: 1,
                connect: 'lower',
                range: {
                    'min': [0],
                    'max': [5280]
                }
            });
  
            _controlBarContainer.find('#range-slider').on({
                "slide": function() {
				    mapModule.setUserSearchRadius($(this).val() * .3048);
                },
			    "change": function(){
				    var userLocation = mapModule.getUserLocation();		
			        var query = "?$where=date >= '" + _options["startDate"] + "' AND date <= '" + _options["endDate"] + "' AND within_circle(location," + userLocation["geometry"]["coordinates"][1] + "," + userLocation["geometry"]["coordinates"][0] + "," + mapModule.getUserSearchRadius() + ")&$order=date DESC";
			        
					mapModule.showLoader();
					
					resourcesModule.getIncidentsFromAPI(query, function(data){
			            //data - is a FeatureCollection with an array "features"
				        mapModule.drawApiResponse(data);
						_refreshDownloadButtonURLs(query);
						_loadDataToTable(query);
			        });
				},
			    "set": function(){
				    mapModule.setUserSearchRadius($(this).val() * .3048);
				    var userLocation = mapModule.getUserLocation();		
			        var query = "?$where=date >= '" + _options["startDate"] + "' AND date <= '" + _options["endDate"] + "' AND within_circle(location," + userLocation["geometry"]["coordinates"][1] + "," + userLocation["geometry"]["coordinates"][0] + "," + mapModule.getUserSearchRadius() + ")&$order=date DESC";
			        
					mapModule.showLoader();
					
					resourcesModule.getIncidentsFromAPI(query, function(data){
			            //data - is a FeatureCollection with an array "features"
				        mapModule.drawApiResponse(data);
						_refreshDownloadButtonURLs(query);
						_loadDataToTable(query);
			        });					
				}					
            });
			
            _controlBarContainer.find("#range-slider").Link('lower').to($('#range-slider-input'), null, wNumb({
                decimals: 0
            }));
			
            _options["startDate"] = moment().subtract(29, 'days').format('YYYY-MM-DD');
            _options["endDate"] = moment().format('YYYY-MM-DD');
  
            _controlBarContainer.find('#daterange').val(moment().subtract(29, 'days').format('MM/DD/YYYY') + ' - ' + moment().format('MM/DD/YYYY'));
			
			_controlBarContainer.find('#daterange').daterangepicker({
				ranges: {
				    'Last 30 Days': [moment().subtract(29, 'days'), moment()],
				    'This Month': [moment().startOf('month'), moment().endOf('month')],
				    'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
				    'This Quarter': [moment().startOf('quarter'), moment().endOf('quarter')],
				    'Last Quarter': [moment().subtract(3, 'months').startOf('quarter'), moment().subtract(3, 'months').endOf('quarter')],
				    'This Year': [moment().startOf('year'), moment()],
				    'Last Year': [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')]
				},
				startDate: moment().subtract(29, 'days'),
				endDate: moment(),
				format: 'MM/DD/YYYY'
			},
			function(start, end) {
				_options["startDate"] = start.format('YYYY-MM-DD');
				_options["endDate"] = end.format('YYYY-MM-DD');
				_controlBarContainer.find('#daterange').val(start.format('MM/DD/YYYY') + ' - ' + end.format('MM/DD/YYYY'));
				
				//Start the API call
				var userLocation = mapModule.getUserLocation();		
				var query = "?$where=date >= '" + _options["startDate"] + "' AND date <= '" + _options["endDate"] + "' AND within_circle(location," + userLocation["geometry"]["coordinates"][1] + "," + userLocation["geometry"]["coordinates"][0] + "," + mapModule.getUserSearchRadius() + ")&$order=date DESC";
				
				mapModule.showLoader();
				
				resourcesModule.getIncidentsFromAPI(query, function(data){
					//data - is a FeatureCollection with an array "features"
					mapModule.drawApiResponse(data);
					_refreshDownloadButtonURLs(query);
					_loadDataToTable(query);
				});			
			});			
			
		}
		else
		{
		    //Error
		    console.log("Upper controls container doesn't exist");
		}

        if(!!domContainer2){
		    _controlBarLowerContainer = domContainer2;
			
			_table = _controlBarLowerContainer.find('#example').DataTable({
                "ajax": {
                    "url": "empty.json",
                    "dataSrc": ""
                },
                "columns": [
                    { "data": "incidntnum" },
                    { "data": "category" },
                    { "data": "descript" },
                    { "data": "resolution" }
                ],
                "pageLength": 50
            });			
		}
		else
		{
		    console.log("Lower controls container doesn't exist");
		}
	}

    /**
      * @param {string} query
    */		
    function _refreshDownloadButtonURLs(query){
		_controlBarLowerContainer.find("#download-csv").attr("href", resourcesModule.getCsvLink(query));
		_controlBarLowerContainer.find("#open-geojsonio").attr("href", resourcesModule.getGeojsonio(query));
		_controlBarLowerContainer.find("#open-cartodb").attr("href", resourcesModule.getCartoDbUrl(query));
	}

    /**
      * @param {string} query
    */		
	function _loadDataToTable(query){
	    var datasetURL = resourcesModule.getDatasetJsonURL(query);
		_table.ajax.url(datasetURL).load();
	}
	
    /**
      * @param {object} sgstnList
    */		
	function _setSuggestionsListContent(clickedIndex){	
		//Assign the returned autocomplete values to a variable
		var acFeatures = resourcesModule.getLatestAutocompleteFeatures();
		
		//Use the map module to change the user pin's location
		mapModule.plotUserLocation(acFeatures[clickedIndex]);
		mapModule.centerMapOnLocation(acFeatures[clickedIndex]);
		
		//Hide the suggestions list
		$(this).parent().hide();
		
		//Start the API call
		var userLocation = mapModule.getUserLocation();		
		var query = "?$where=date >= '" + _options["startDate"] + "' AND date <= '" + _options["endDate"] + "' AND within_circle(location," + userLocation["geometry"]["coordinates"][1] + "," + userLocation["geometry"]["coordinates"][0] + "," + mapModule.getUserSearchRadius() + ")&$order=date DESC";
		
		mapModule.showLoader();
		
		resourcesModule.getIncidentsFromAPI(query, function(data){
			//data - is a FeatureCollection with an array "features"
			mapModule.drawApiResponse(data);
			_refreshDownloadButtonURLs(query);
			_loadDataToTable(query);
		});
	}

	function _setDataUpdated(){
		var query = "?$select=date,time&$limit=1&$order=date DESC,time DESC";
		var datasetRequest = resourcesModule.getDatasetJsonURL(query);
		$.getJSON(datasetRequest, function(data){
			console.log(data)
			$('#data-updated').html('<b>Data available through ' + moment(data[0].date).format('MMMM DD, YYYY') + ' at ' + moment(data[0].time,'HH:mm').format('hh:mm a')+'</b>')
		});
	}
	
	function _getStartDate(){
	    return _options["startDate"];
	}
	
	function _getEndDate(){
	    return _options["endDate"];
	}	
	
    return {
	    init: _init,
		setSuggestionsListContent: _setSuggestionsListContent,
		getEndDate: _getEndDate,
		getStartDate: _getStartDate
    };
  
})(window, jQuery);
