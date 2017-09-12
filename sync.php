<?php
header('Content-Type: application/json; charset=utf-8');
$clientTime = $_GET["ct"] * 1; //for php 5.2.1 or up: (float)$_GET["ct"];
$serverTimestamp = round(microtime(true)*1000); // (new DateTime())->getTimestamp();
$serverClientRequestDiffTime = $serverTimestamp - $clientTime;
echo "{\"diff\":$serverClientRequestDiffTime,\"serverTimestamp\":$serverTimestamp}";
?>
