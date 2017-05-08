<?php

function get_rates_peninsula() {
    include 'auth/auth.php';
    include 'ChromePhp.php';
        
    if(isset($_GET['call'])){
        $dest_zip = $_GET['zip'];
        $total_weight = $_GET['total_weight'];
        $freight_class = $_GET['freight_class'];
        $hazmat = $_GET['hazmat'];
        $liftgate = $_GET['liftgate'];
    }
    
    $options_text = "";
    $options = false;
    
    if ($hazmat === "true") {
        $options_text .= "HM,";
    }
    if ($liftgate === "true") {
        $options_text .= "LD,";
    }
    
    $url = "http://peninsulatruck.com/WebServices/WebTools.asmx/GetRateQuote?userId=$ptl_user&password=$ptl_pass&account=$ptl_account&originZip=97402&destinationZip=$dest_zip&classList=$freight_class&weightList=$total_weight&accessorialList=$options_text";
    
    $ch = curl_init();
    
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
    curl_setopt($ch, CURLOPT_HEADER, FALSE);

    curl_setopt($ch, CURLOPT_CAINFO, dirname(__FILE__) . '/../misc/cacert.pem');
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    echo $response = curl_exec($ch);
    curl_close($ch);
}

get_rates_peninsula();