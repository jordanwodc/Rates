<?php

function validate_zip() 
{
    include 'auth/auth.php';
    
    $zip = $_GET['zip'];

    $ch = curl_init();  

    curl_setopt($ch, CURLOPT_URL, 'http://Production.ShippingAPIs.com/ShippingAPI.dll');  
    curl_setopt($ch, CURLOPT_HEADER, 1);  
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);  

    curl_setopt($ch, CURLOPT_POST, 1);
    
    $data = "API=CityStateLookup&XML=
                <CityStateLookupRequest USERID=\"$usps_user\">
                  <ZipCode ID=\"0\">
                    <Zip5>$zip</Zip5>
                  </ZipCode>
                </CityStateLookupRequest>";

    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);  

    $result = (string)curl_exec($ch);
    echo $result;
}

validate_zip();