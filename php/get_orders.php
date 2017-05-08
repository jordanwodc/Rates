<?php

function get_orders() {
    include 'auth/auth.php';
    include 'ChromePhp.php';

    if(isset($_GET['call'])){}

    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, "https://ssapi.shipstation.com/orders?pageSize=500");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
    curl_setopt($ch, CURLOPT_HEADER, FALSE);

    curl_setopt($ch, CURLOPT_GET, TRUE);

    curl_setopt($ch, CURLOPT_CAINFO, dirname(__FILE__) . '/../misc/cacert.pem');
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        "Authorization: Basic $auth"
    ));

    $response = curl_exec($ch);
    curl_close($ch);

    echo $response;
}

get_orders();