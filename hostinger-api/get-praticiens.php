<?php
/**
 * API: Récupérer la liste des praticiens
 * GET /api/get-praticiens.php
 */
require_once 'config.php';

try {
    $sql = "SELECT DISTINCT Praticien FROM analyse_jours_ouverts WHERE Praticien IS NOT NULL AND Praticien != '' ORDER BY Praticien";
    $stmt = $pdo->query($sql);
    $praticiens = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo json_encode([
        'success' => true,
        'data' => $praticiens,
        'count' => count($praticiens)
    ]);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Query failed',
        'message' => $e->getMessage()
    ]);
}
?>
