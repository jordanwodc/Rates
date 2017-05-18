/*-------------------------------TODO--------------------------------

-- improve checkbox option monitoring (maybe)

-------------------------------------------------------------------*/

// Fees
const FREIGHT_MULTIPLIER = 1.15;

const UPS_COD_FEE = 10.00,
      UPS_FEE_MULTIPLIER = 1.10,
      PTL_FEE_MULTIPLIER = FREIGHT_MULTIPLIER,
      RR_FEE_MULTIPLIER = FREIGHT_MULTIPLIER,
      YRC_FEE_MULTIPLIER = FREIGHT_MULTIPLIER;

const WARN = '#ffb74d',
      ERROR = '#ef5350';
    
// Location variables
var city,
    state,
    zip;

// Quote variables
var quotes = {},
    rr_total,
    ptl_total,
    selected_service,
    selected_cost,
    ups_package_cost,
    ups_total,
    ups_transit_time,
    yrc_total;
    
// Misc data
var PRODUCTS,
    progress_current = 0,
    progress_total = 0,
    YRC_HOLIDAYS;

var numbers = [
    'zero',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen'
];

var transit_time_enabled = true;

$.when(
	$.getJSON('misc/products.json', function(data) {
		PRODUCTS = data;
	}),
	$.getJSON('misc/yrc_holidays.json', function(data) {
		YRC_HOLIDAYS = data;
	})
).then(function() {
	monitor_zip_input();
	build_product_menu();
   	monitor_product_menu();
    build_pack_size_menu();
   	monitor_pack_size_menu();
    build_qty_menu();
    monitor_qty_menu();
    monitor_cod_checkbox();
    monitor_liftgate_checkbox();
    monitor_submit_button();
});

function submit_data() {
    function go() {
        reset_data();
        $('#services_outer').css('visibility', 'visible');
        validate_zip();
    }
    if (cod_checked()) {
        if (total_qty() <= selected_product['max_cod']) {
            go();
        }
        else {
            update_location_display('Quantity exceeds maximum amount for COD', 'error', 18);
        }
    }
    else {
        go();
    }
}


/**********************************************************************
	ZIP validations with USPS API
**********************************************************************/

function validate_zip() {
    update_location_display('Getting location info', 'normal');
    zip = input_zip();
    zip = zip.replace(/[^\/\d]/g, '');
    if (zip.length > 5) {
        zip = zip.substring(0, 5);
    }
    $('#zip_input').val(zip);
    var valid_zip = /(^\d{5}$)/.test(zip);
    if (valid_zip) {
        set_elements_loading();
	    $.ajax({
	        url:'php/validate_zip.php?call=true',
	        type:'GET',
	        data: {
	        	zip: zip
	        },
	        success: handle_valid_zip,
	        error: function() {
                update_location_display('Error. Please try again.', 'error');
                reset_data();
	        }
	    });
	}
	else {
        update_location_display('Invalid Zip Code', 'error');
        reset_data();
	}
}

function handle_valid_zip(data) {
    var hazmat = PRODUCTS[selected_product_name()]['hazmat'];
    if (data.indexOf('<Description>') > -1) {
        var description = data.split('<Description>')[1].split('</Description>')[0].replace('.', '');
        update_location_display(description, 'error');
        reset_data();
    }
    else if (data.indexOf('<City>') > -1 && data.indexOf('State') > -1) {
        city = title_case(data.split('<City>')[1].split('</City>')[0]);
        state = data.split('<State>')[1].split('</State>')[0];
        if (hazmat && state === 'HI') {
            update_location_display('Invalid location', 'error');
            alert('Special service required for hazardous shipments to Hawaii')
            set_elements_normal();
        }
        else if (hazmat && state === 'AK') {
            update_location_display('Invalid location', 'error');
            alert('Special service required for hazardous shipments to Alaska')
            set_elements_normal();
        }
        else {
            update_location_display(city + ', ' + state);
            
            var dimensions = selected_product['pack_sizes'][selected_size()]['dimensions'];
            length = dimensions['length'];
            width = dimensions['width'];
            height = dimensions['height'];
            if (selected_product['pallet_shipments'] && total_qty() >= selected_product['pallet_minimum']) {
                get_all_quotes();
            }
            else {
                $('#service_display').html('Getting UPS rates');
                var ss_response = get_rates_ups();
                if (transit_time_enabled) {
                    var ups_response = get_ups_transit_time();
                    $.when(ss_response, ups_response).done(function() {
                        quotes.push({
                            name: 'UPS Ground',
                            amount: ups_total,
                            del_date: ups_transit_time
                        });
                        compare_quotes();
                    });
                }
                else {
                    $.when(ss_response).done(function() {
                        quotes.push({
                            name: 'UPS Ground',
                            amount: ups_total,
                            del_date: null
                        });
                        compare_quotes();
                    });
                }
            }
        }
    }
}


/**********************************************************************
	Call freight quote APIs and compare when all rates are received
**********************************************************************/

function get_all_quotes() {
    $('#service_display').html('Getting shipping rates');
    var pack_height = PRODUCTS[selected_product_name()]['pack_sizes'][selected_size()]['dimensions']['height'];
    var pallet_row = PRODUCTS[selected_product_name()]['pallet_row'];
    var total_weight = (pack_weight() * selected_qty()) + 45;
    var total_height = (Math.ceil(total_qty() / pallet_row) * (pack_height)) + 6;

    var ship_date = get_yyyymmdd(new Date());
    var ship_yyyymmdd = ship_date; //get_next_business_day(ship_date);

    console.log('Shipdate: ' + ship_yyyymmdd);
    console.log('Total Weight: ' + total_weight);
    console.log('Total Height: ' + total_height);
    var ss_response = get_rates_ups();
    var ptl_response = get_rates_ptl(total_weight);
    var rr_response = get_rates_rr(total_weight);
    var yrc_resonse = get_rates_yrc(ship_yyyymmdd, total_weight, total_height);
    var ups_deferred = $.Deferred();
    if (transit_time_enabled) {
        var ups_response = get_ups_transit_time();
        $.when(ss_response, ups_response).done(function() {
            if (ups_total !== undefined) {
                quotes['ups_ground'] = {
                    name: 'UPS Ground',
                    amount: ups_total,
                    del_date: ups_transit_time
                };
            }
            ups_deferred.resolve();
        });
    }
    else {
        $.when(ss_response).done(function() {
            if (ups_total !== undefined) {
                quotes['ups_ground'] = {
                    name: 'UPS Ground',
                    amount: ups_total,
                    del_date: null
                };
            }
            ups_deferred.resolve();
        });
    }
    $.when(ups_deferred, yrc_resonse, rr_response, ptl_response).done(function() {
        compare_quotes();
    });
}


/**********************************************************************
	Get UPS cost from ShipStation API
**********************************************************************/

function get_rates_ups() {
    return $.ajax({
        url:'php/get_rates_shipstation.php?call=true',
        type:'GET',
        data: {
        	zip: zip,
            weight: pack_weight(),
            length: length,
            width: width,
            height: height
        },
        beforeSend: function() {
            $('#services_inner').append(build_service_display_contents('UPS Ground'));
            progress_total += 1;
            update_progress_bar();
        },
        success: function(data) {
            progress_current += 1;
            update_progress_bar();
            if (data.indexOf('Exception') === -1) {
                var ups_json = JSON.parse(data)[0];
                var cod_amount = 0;
                if (cod_checked()) cod_amount = UPS_COD_FEE;
                ups_package_cost = ups_json['shipmentCost'] * UPS_FEE_MULTIPLIER;
                ups_total = (ups_package_cost * selected_qty()) + cod_amount;
            }
            else {
                ups_total = 999999;
            }
            $('#ups_ground_service_display').find('.spinner').removeClass('loading');
            $('#ups_ground_service_display').find('.spinner').html('✓');
        },
        error: function(data) {
            update_location_display('Error. Please try again.', 'error');
        }
    });
}

function get_ups_transit_time() {
    return $.ajax({
        url: 'php/get_ups_transit_time.php?call=true',
        type: 'GET',
        dateType: 'json',
        data: {
            state: state,
            zip: zip,
            date: get_yyyymmdd(new Date()),
            weight: pack_weight()
        },
        success: function(data) {
            var ups_json = JSON.stringify(JSON.parse(data)['TimeInTransitResponse']['TransitResponse']['ServiceSummary']);
            ups_json = JSON.parse(ups_json);
            for (i in ups_json) {
                if (ups_json[i]['Service']['Code'] === 'GND') {
                    ups_transit_time = ups_json[i]['EstimatedArrival']['Arrival']['Date'];
                }
            }
        },
        error: function() {
            alert('Error getting UPS transit time');
        }
    });
}


/**********************************************************************
    Get shipping cost from YRC API
**********************************************************************/

function get_rates_yrc(ship_yyyymmdd, total_weight, total_height) {
    return $.ajax({
        url: 'php/get_rates_yrc.php?call=true',
        type: 'GET',
        data: {
            city: city.replace(/\s/g, '+'),
            state: state,
            zip: zip,
            ship_date: ship_yyyymmdd,
            freight_class: selected_product['freight_class'],
            total_weight: total_weight,
            height: total_height,
            hazmat: hazmat_product(),
            liftgate: liftgate_checked()
        },
        beforeSend: function() {
            $('#services_inner').append(build_service_display_contents('YRC Freight'));
            progress_total += 1;
            update_progress_bar();
        },
        success: function(data) {
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(data, 'text/xml');           
            progress_current += 1;
            update_progress_bar();
            try {
                yrc_total = (parseFloat(xmlDoc.getElementsByTagName('TotalCharges')[0].childNodes[0].nodeValue) / 100) * YRC_FEE_MULTIPLIER;
                var date = xmlDoc.getElementsByTagName('StandardDate')[0].childNodes[0].nodeValue;
            }
            catch (e) {
                yrc_total = 999999;
                del_date = null;
            } 
            $('#yrc_freight_service_display').find('.spinner').removeClass('loading');
            $('#yrc_freight_service_display').find('.spinner').html('✓');
            quotes['yrc_freight'] = {
                name: 'YRC Freight',
                amount: yrc_total,
                del_date: date
            };
        },
        error: function(data) {
            alert('Error getting rates from YRC.');
            console.log(data);
        }
    });
}


/**********************************************************************
	Get shipping cost from RoadRunner API
**********************************************************************/

function get_rates_rr(total_weight) {
    return $.ajax({
        url: 'php/get_rates_roadrunner.php?call=true',
        type: 'GET',
        data: {
            zip: zip,
            total_weight: total_weight,
            freight_class: selected_product['freight_class'],
            hazmat: hazmat_product(),
            liftgate: liftgate_checked()
        },
        beforeSend: function() {
            $('#services_inner').append(build_service_display_contents('Roadrunner Transportation Systems'));
            progress_total += 1;
            update_progress_bar();
        },
        success: function(data) {
            progress_current += 1;
            update_progress_bar();
            if (data.indexOf('Error') === -1) {
                rr_total = data.split('<NetCharge>')[1].split('</NetCharge>')[0] * RR_FEE_MULTIPLIER;
                var transit_days = data.split('<EstimatedTransitDays>')[1].split('</EstimatedTransitDays>')[0];
                var date = new Date();
                date.setDate(date.getDate() + parseInt(transit_days, 10));
                date = get_yyyymmdd(calculate_business_days(date));
            }
            else {
                rr_total = 999999;
                date = null;
            }
            $('#roadrunner_transportation_systems_service_display').find('.spinner').removeClass('loading');
            $('#roadrunner_transportation_systems_service_display').find('.spinner').html('✓');
            quotes['roadrunner_transportation_systems'] = {
                name: 'RoadRunner Transportation Systems',
                amount: rr_total,
                del_date: date
            };
        },
        error: function(data) {
            alert('Error getting rates from RoadRunner');
            console.log(data);
        }
    });
}


/**********************************************************************
	Get shipping cost from Peninsula API
**********************************************************************/

function get_rates_ptl(total_weight) {
    return $.ajax({
        url: 'php/get_rates_peninsula.php?call=true',
        type: 'GET',
        data: {
            zip: zip,
            total_weight: total_weight,
            freight_class: selected_product['freight_class'],
            hazmat: hazmat_product(),
            liftgate: liftgate_checked()
        },
        beforeSend: function() {
            $('#services_inner').append(build_service_display_contents('Peninsula Truck Lines'));
            progress_total += 1;
            update_progress_bar();
        },
        success: function(data) {
            console.log(data);
            progress_current += 1;
            update_progress_bar();
            if (data.indexOf('errors') === -1) {
                ptl_total = data.split('<totalCharge>')[1].split('</totalCharge>')[0] * PTL_FEE_MULTIPLIER;
                var transit_days = data.split('<deliveryDay')[1].split('</deliveryDay>')[0];
                var date = new Date();
                var days = 999;
                var deliveryText = data.split('<deliveryDay>')[1];
                deliveryText = deliveryText.split('</deliveryDay>')[0];
                var mult = 1;
                if (deliveryText.toLowerCase().indexOf('week') > -1) mult = 7;
                for (var i = 0; i < numbers.length; i++) {
                    if (deliveryText.toLowerCase().indexOf(numbers[i]) > -1) {
                        days = i;
                    }
                }
                console.log(days);
                //date.setDate(date.getDate() + parseInt(transit_days, 10));
                date = get_yyyymmdd(calculate_business_days(date, days));
            }
            else {
                ptl_total = 999998;
                date = null;
            }
            $('#peninsula_truck_lines_service_display').find('.spinner').removeClass('loading');
            $('#peninsula_truck_lines_service_display').find('.spinner').html('✓');
            quotes['peninsula_truck_lines'] = {
                name: 'Peninsula Truck Lines',
                amount: ptl_total,
                del_date: date
            };
        },
        error: function(data) {
            alert('Error getting rates from Peninsula Truck');
            console.log(data);
        }
    });
}

/**********************************************************************
	Compare quotes and display the cheapest
**********************************************************************/

function compare_quotes() {
    var service, amount;
    $('#services_inner').append($('#services_inner .service').sort(function(a, b) {
        return quotes[a.getAttribute('id').split('_service_display')[0]]['amount'] - quotes[b.getAttribute('id').split('_service_display')[0]]['amount'];
    }));
    for (quote in quotes) {
        var display = $('#' + quotes[quote]['name'].toLowerCase().replace(/\s/g, "_") + '_service_display');
        if (quotes[quote]['amount'] === 999999) {
            $('#' + quotes[quote]['name'].toLowerCase().replace(/\s/g, "_") + '_service_display').addClass('error');
            $(display).find('.service_amount').html('Error getting rates');
            $(display).find('.service_delivery').html('');
        }
        else if (quotes[quote]['amount'] === 999998) {
            $('#' + quotes[quote]['name'].toLowerCase().replace(/\s/g, "_") + '_service_display').addClass('warning');
            $(display).find('.service_amount').html('Unavailable for destination');
            $(display).find('.service_delivery').html('');
        }
        else {
            $(display).find('.service_delivery').html('Estimated delivery: ' + format_date(quotes[quote]['del_date']));
            $(display).find('.service_amount').html('Amount: $' + quotes[quote]['amount'].toFixed(2));
        }
        if (transit_time_enabled) ;
        if (amount !== undefined) {
            if (quotes[quote]['amount'] < amount) {
                amount = quotes[quote]['amount'];
                service = quotes[quote]['name'];
            }
        }
        else {
            amount = quotes[quote]['amount'];
            service = quotes[quote]['name'];
        }
    }
    
    selected_service = service;
    $('#' + service.toLowerCase().replace(/\s/g, "_") + '_service_display').addClass('selected');
    selected_cost = amount;
    update_displays();    
}


/**********************************************************************
	Builder functions
**********************************************************************/

function build_product_menu() {
	var menu = $('#product_select');
	$(menu).html('');
	$.each(PRODUCTS, function(product_name) {
		menu.append(build_option(product_name));
	});
    selected_product = PRODUCTS[selected_product_name()];
}

function build_pack_size_menu() {
	var product = PRODUCTS[selected_product_name()];
	var pack_sizes = product['pack_sizes'];
	var standard_pack_size = product['standard_pack_size'];
	var unit = product['unit'];
	var menu = $('#size_select');
	$(menu).html('');
	$.each(pack_sizes, function(pack_size) {
		var option_label = pack_size + ' ' + unit;
		var selected = '';
		if (parseInt(pack_size, 10) === standard_pack_size) selected = 'selected="selected"';
		menu.append(build_option(option_label, pack_size, selected));
	});
}

function build_qty_menu() {
	var product = PRODUCTS[selected_product_name()];
	var label = product['pack_sizes'][selected_size()]['label'];
	var qtys = product['pack_sizes'][selected_size()]['available_qtys'];
	var menu = $('#qty_select');
	$(menu).html('');
    $(menu).prop('disabled', false);
    $.each(qtys, function(index, line) {
        if (line.indexOf('-') > -1) {
            var splits = line.split('-');
            var start = parseInt(splits[0]);
            var end = parseInt(splits[1]);
            for (var i = start; i <= end; i++) {
                var option_label = i + ' ' + label;
                $(menu).append(build_option(pluralizer(i, option_label), i));
            }
        }
        else {
            var qty = line;
            var option_label = line + ' ' + label;
            $(menu).append(build_option(pluralizer(qty, option_label), qty));
        }
    });
}

function build_option(label, value=null, selected='') {
	if (value === null) value = label;
	return '<option value="' + value + '" ' + selected + '>' + title_case(label) + '</option>';
}

function build_service_display_contents(name) {
    return '<div id="' + name.toLowerCase().replace(/\s/g, "_") + '_service_display" class="service z-depth-1"> \
                <div class="spinner_box"> \
                    <div class="spinner loading"></div> \
                </div> \
                <div class="info_box"> \
                    <div class="service_name">' + name + '</div> \
                    <div class="service_amount"></div> \
                    <div class="service_delivery"></div> \
                </div> \
            </div>';
}


/**********************************************************************
    Display functions
**********************************************************************/

function update_location_display(content, type='normal', fontsize=22) {
    if (type === 'normal') color = 'black';
    else if (type === 'error') color = '#ff4444';
    $('#location_display').css('color', color).css('fontSize', fontsize);
    $('#location_display').html(content);
}

function set_elements_loading() {
    var button = $('#send_button');
    button.prop('disabled', true);
    button.attr('class', 'button-disabled');
    button.html('Loading...');

    $('#product_select').prop('disabled', true);
    $('#size_select').prop('disabled', true);
    $('#qty_select').prop('disabled', true);
    $('#zip_input').prop('disabled', true);
}

function set_elements_normal() {
    var button = $('#send_button');
    button.prop('disabled', false);
    button.attr('class', 'btn btn-primary');
    button.html('Get Rates');

    $('#product_select').prop('disabled', false);
    $('#size_select').prop('disabled', false);
    $('#qty_select').prop('disabled', false);
    $('#zip_input').prop('disabled', false);
}

function display_breakdown() {
    var display = $('#breakdown_display');
    var s = '';
    var each = '';
    var cod_text = '';
    var est = '';
    if (selected_qty() > 1) {
        s = 's';
        each = ' each';
        est = '≈';
    }
    if (selected_service === 'UPS Ground') {
        $('#service_display').html('UPS Ground');
    	if (cod_checked()) cod_text = ' + $' + UPS_COD_FEE.toFixed(2) + ' COD fee';
        $(display).html(`${selected_qty()} package${s} @ ${est}$${ups_package_cost.toFixed(2)} ${each} ${cod_text}`);
    }
    else {
        $('#service_display').html(selected_service)
        $(display).html('1 pallet @ $' + selected_cost.toFixed(2));
    }
}

function display_amount() {
    var amount_display = $('#amount_display');
    amount_display.html('$' + selected_cost.toFixed(2));
    set_elements_normal();
}

function update_displays() {
    display_breakdown();
    display_amount();
    set_elements_normal();
}

function reset_data(reason='', suggestion='Click to get updated rates') {
    $('#amount_display').html('$0.00');
    if (reason !== '') { 
        $('#service_display').html(reason);
        $('#breakdown_display').html(suggestion);
    }
    else {
        $('#service_display').html('&nbsp;');
        $('#breakdown_display').html('&nbsp;');
    }
    set_elements_normal();
    $('#services_inner').html('');
    selected_service = null;
    quotes = [];
    $('#services_outer').css('visibility', 'hidden');
    progress_total = 0;
    progress_current = 0;
    update_progress_bar();
}

function update_progress_bar() {
    var bar = document.getElementById('progress_bar_inner');
    var progress;
    if (progress_current === 0 && progress_total !== 0) progress = 3;
    else if (progress_current !== 0 && progress_total !== 0) 
    	progress = (progress_current / progress_total) * 100;
    else progress = 100;
    
    bar.style.width = progress + '%';
}


/**********************************************************************
    Element monitors
**********************************************************************/

function monitor_submit_button() {
    $('#send_button').click(function() {
        submit_data();
    });
}

function monitor_enter_key() {
    $(document).keypress(function(e) {
        var key = e.which;
        if (key == 13) submit_data();
    });
}

function monitor_zip_input() {
	$('#zip_input').change(function() {
		update_location_display('&nbsp;');
        if (selected_service !== undefined) {
            if (selected_service === null) {
                reset_data();
            }
            else {
                reset_data('Location changed')
            }
            selected_service = null;
        }
	});
}

function monitor_product_menu() {
	var menu = $('#product_select');
	$(menu).change(function() {
        if (selected_service !== undefined) {
        	if (selected_service === null) {
        		reset_data();
        	}
        	else {
            	reset_data('Product selection has changed');
        	}
            selected_service = null;
        }
        selected_product = PRODUCTS[selected_product_name()];
        build_pack_size_menu();
        build_qty_menu();
	});
}

function monitor_pack_size_menu() {
	var menu = $('#size_select');
	$(menu).change(function() {
        if (selected_service !== undefined) {
        	if (selected_service === null) {
        		reset_data();
        	}
        	else {
            	reset_data('Pack size selection has changed');
        	}
            selected_service = null;
        }
        build_qty_menu();
	}); 
}

function monitor_qty_menu() {
    var menu = $('#qty_select');
    $(menu).change(function() {
        var max_cod = selected_product['max_cod'];
        var pallet_minimum = selected_product['pallet_minimum'];
        if (selected_service !== undefined) {
            if (selected_service !== null) {
                if (total_qty() >= pallet_minimum) {
                    reset_data('Bulk quantity selected');
                }
                else {
                    ups_total = ups_package_cost * selected_qty();
                    $('#ups_ground_service_display').find('.service_amount').html('Amount: $' + ups_total.toFixed(2));
                    if (selected_service === 'UPS Ground') {
                        selected_cost = ups_total;
                        display_breakdown();
                        display_amount();
                    }
                }
            }
            else {
                reset_data();
            }
        }
        else {
            reset_data();
        }
    });
}

function monitor_cod_checkbox() {
    $('#cb_cod').change(function() {
        if (selected_service !== undefined) {
            if (selected_service !== null) {
                reset_data('COD option selected');
            }
        }
    });
}

function monitor_liftgate_checkbox() {
    $('#cb_liftgate').change(function() {
        if (selected_service !== undefined) {
            if (selected_service !== null) {
                if (total_qty() >= PRODUCTS[selected_product_name()]['pallet_minimum']) { 
                    if (liftgate_checked()) {
                        reset_data('Liftgate service selected');
                    }
                    else {
                        reset_data('Liftgate service removed');
                    }
                }
            }
            else reset_data();
        }
    });
}


/**********************************************************************
    Utility functions
**********************************************************************/

function title_case(input) {
    var words = input.split(/(\s|-)+/),
        output = [];

    for (var i = 0, len = words.length; i < len; i += 1) {
        output.push(words[i][0].toUpperCase() +
                    words[i].toLowerCase().substr(1));
    }

    return output.join('');
}

function get_yyyymmdd(date) {
    var yyyy = date.getFullYear().toString();
    
    var mm = (date.getMonth() + 1).toString();
    if (mm.length === 1) mm = '0' + mm;
    
    var dd = date.getDate().toString();
    if (dd.length === 1) dd = '0' + dd;
    
    return yyyy + mm + dd;
}

function format_date(yyyymmdd) {
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
	if (yyyymmdd !== null) {
	    var yyyy = yyyymmdd.substring(0, 4);
	    var mm = yyyymmdd.substring(4, 6);
	    var dd = yyyymmdd.substring(6, 8);
        var day = days[parseInt(dd) % 7];
	    
	    return day + ' ' + mm + '/' + dd + '/' + yyyy; 
	}
	else return '01/01/1970';
}

function calculate_business_days(date, days_to_add=0) {
    var yyyymmdd = get_yyyymmdd(date);
    
    while (YRC_HOLIDAYS.indexOf(yyyymmdd) > -1) {
        date.setDate(date.getDate() + 1);
    }
    while (!(date.getDay() % 6)) date.setDate(date.getDate() + 1);
    if (days_to_add > 0) {
        date.setDate(date.getDate() + days_to_add);
    }
    
    return date;
}

function pluralizer(qty, label) {
	if (qty > 1) {
		return label + 's';
	}
	else return label;
}

function input_zip() { return $('#zip_input').val(); }
function selected_product_name() { return $('#product_select').val(); }
function selected_size() { return $('#size_select').val(); }
function selected_qty() { return $('#qty_select').val(); }
function cod_checked() { return $('#cb_cod').is(':checked'); }
function liftgate_checked() { return $('#cb_liftgate').is(':checked'); }
function pack_weight() { return PRODUCTS[selected_product_name()].pack_sizes[selected_size()].weight.value; }
function total_qty() { return selected_size() * selected_qty() }
function hazmat_product() { return PRODUCTS[selected_product_name()].hazmat }