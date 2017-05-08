<?php

function get_rates_shipstation() {
    include 'auth/auth.php';
    include 'ChromePhp.php';

    if(isset($_GET['call'])){
        $weight = $_GET['weight'];
        $zip = $_GET['zip'];
        $length = intval($_GET['length']);
        $width = intval($_GET['width']);
        $height = intval($_GET['height']);
    }

    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, "https://ssapi.shipstation.com/shipments/getrates");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
    curl_setopt($ch, CURLOPT_HEADER, FALSE);

    curl_setopt($ch, CURLOPT_POST, TRUE);

    curl_setopt($ch, CURLOPT_CAINFO, dirname(__FILE__) . '/../misc/cacert.pem');
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    curl_setopt($ch, CURLOPT_POSTFIELDS, "{
        \"carrierCode\": \"ups\",
        \"serviceCode\": \"ups_ground\",
        \"packageCode\": \"package\",
        \"fromPostalCode\": \"97402\",
        \"toCountry\": \"US\",
        \"toPostalCode\": \"$zip\",
        \"weight\": {
            \"value\": $weight,
            \"units\": \"pounds\"
        },
        \"dimensions\": {
            \"units\": \"inches\",
            \"length\": $length,
            \"width\": $width,
            \"height\": $height
        },
        \"confirmation\": \"none\",
        \"residential\": false
    }");

    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        "Content-Type: application/json",
        "Authorization: Basic $ss_auth"
    ));

    $response = curl_exec($ch);
    curl_close($ch);

    echo $response;
}

get_rates_shipstation();