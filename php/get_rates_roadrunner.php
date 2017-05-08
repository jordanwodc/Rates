<?php

function get_rates_rr() {
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
        $options = true;
        $options_text .= "<ServiceOptions><ServiceCode>HAZ</ServiceCode></ServiceOptions>";
    }
    if ($liftgate === "true") {
        $options = true;
        $options_text .= "<ServiceOptions><ServiceCode>LGD</ServiceCode></ServiceOptions>";
    }
    
    if ($options) {
        $options_text = "<ServiceDeliveryOptions>" . $options_text . "</ServiceDeliveryOptions>";
    }
        
    $xml_str = "<soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">
        <soap:Header>
            <AuthenticationHeader xmlns=\"https://webservices.rrts.com/ratequote/\">
                <UserName>$rr_user</UserName>
                <Password>$rr_pass</Password>
            </AuthenticationHeader>
        </soap:Header>
        <soap:Body>
            <RateQuote xmlns=\"https://webservices.rrts.com/ratequote/\">
                <request>
                    <OriginZip>97402</OriginZip>
                    <DestinationZip>$dest_zip</DestinationZip>
                    <ShipmentDetails>
                        <ShipmentDetail>
                            <ActualClass>$freight_class</ActualClass>
                            <Weight>$total_weight</Weight>
                        </ShipmentDetail>
                    </ShipmentDetails>
                    <OriginType>O</OriginType>
                    <PaymentType>P</PaymentType>
                    <PalletCount>1</PalletCount>
                    <LinearFeet>0</LinearFeet>
                    <Pieces>0</Pieces>
                    $options_text
                    <PalletPosition/>
                </request>
            </RateQuote>
        </soap:Body>
    </soap:Envelope>";
    

    $headers = array(
        "Content-Type: text/xml; charset=utf-8"
    );
    
    $url = 'https://webservices.rrts.com/rating/ratequote.asmx';
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $xml_str);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    
    $response = curl_exec($ch);
    ChromePhp::log($response);
    echo $response;
    curl_close($ch);
}

get_rates_rr();