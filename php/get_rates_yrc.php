<?php

function get_rates_yrc() {
    include 'auth/auth.php';
    include 'ChromePhp.php';
    
    if(isset($_GET['call'])){
        $dest_zip = $_GET['zip'];
        $dest_city = $_GET['city'];
        $dest_state = $_GET['state'];
        $ship_date = $_GET['ship_date'];
        $freight_class = $_GET['freight_class'];
        $weight = $_GET['total_weight'];
        $height = $_GET['height'];
        $hazmat = $_GET['hazmat'];
        $liftgate = $_GET['liftgate'];
    }
    
    $service = 'GDEL';

    $cont = true;
    $zip_file = fopen('../misc/zipcode.csv', 'r');
    while (!feof($zip_file) && $cont) {
        $line = fgets($zip_file);
        if (strpos($line, '"' . $dest_zip . '"') !== false) {
            $cont = false;
            $zone = explode(',', $line)[5];
            if ($zone !== '"-5"') {
                $service = 'STD';
            }
        }
    }
    
    $options_count = 0;
    $options_text = "";
    
    if ($hazmat === "true") {
        $options_count += 1;
        $options_text .= "&HazmatInd=Y&AccOption$options_count=HAZM";
    }
    
    if ($liftgate === "true") {
        $options_count += 1;
        $options_text .= "&AccOption$options_count=LFTD";
    }
    
    if ($options_count > 0) {
        $options_text .= "&AccOptionCount=$options_count";
    }
    
    $ch = curl_init();
    
    $url = "https://my.yrc.com/dynamic/national/servlet?" . 
        "CONTROLLER=com.rdwy.ec.rexcommon.proxy.http.controller.ProxyApiController" .
        "&redir=/tfq561" .
        "&LOGIN_USERID=$yrc_sender_id" .
        "&LOGIN_PASSWORD=$yrc_pass" .
        "&BusId=$yrc_bus_id" .
        "&BusRole=Shipper" .
        "&PaymentTerms=Prepaid" .
        "&OrigCityName=eugene" .
        "&OrigStateCode=or" .
        "&OrigZipCode=97402" .
        "&OrigNationCode=usa" .
        "&DestCityName=$dest_city" .
        "&DestStateCode=$dest_state" .
        "&DestZipCode=$dest_zip" .
        "&DestNationCode=USA" .
        "&ServiceClass=$service" .
        "&PickupDate=$ship_date" .
        "&TypeQuery=QUOTE&LineItemWeight1=$weight" .
        "&LineItemNmfcClass1=$freight_class" .
        "&LineItemCount=1" .
        $options_text .
        "&LineItemHandlingUnits1=1" .
        "&LineItemPackageCode1=PLT" .
        "&LineItemPackageLength1=48" .
        "&LineItemPackageWidth1=40" .
        "&LineItemPackageHeight1=$height";

    curl_setopt($ch, CURLOPT_URL, $url);
    
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
    curl_setopt($ch, CURLOPT_HEADER, FALSE);

    curl_setopt($ch, CURLOPT_CAINFO, dirname(__FILE__) . '/../misc/cacert.pem');
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $response = curl_exec($ch);
    curl_close($ch);
    
    //ChromePhp::log('yrc');
    //ChromePhp::log($url);
    //ChromePhp::log($response);

    echo $response;
}

get_rates_yrc();