<?php

function list_services($carrier) {
    include 'auth/auth.php';
    
    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, "https://ssapi.shipstation.com/carriers/listservices?carrierCode=$carrier");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
    curl_setopt($ch, CURLOPT_HEADER, FALSE);

    curl_setopt($ch, CURLOPT_CAINFO, dirname(__FILE__) . '/../misc/cacert.pem');
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
      "Authorization: Basic $ss_auth"
    ));

    $response = curl_exec($ch);
    curl_close($ch);

    echo $response;
}

list_services('stamps_com');