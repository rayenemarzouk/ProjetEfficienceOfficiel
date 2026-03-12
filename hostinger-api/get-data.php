<?php
/**
 * API: Récupérer les données d'une table spécifique
 * GET /api/get-data.php?table=analyse_realisation&praticien=JC&mois=20250101
 */
require_once 'config.php';

// Tables autorisées (sécurité)
$allowedTables = [
    'analyse_devis',
    'analyse_jours_ouverts', 
    'analyse_realisation',
    'analyse_rendezvous',
    'encours'
];

// Récupérer les paramètres
$table = $_GET['table'] ?? '';
$praticien = $_GET['praticien'] ?? null;
$mois = $_GET['mois'] ?? null;
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : null;

// Valider la table
if (!in_array($table, $allowedTables)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid table',
        'message' => 'Table non autorisée',
        'allowed' => $allowedTables
    ]);
    exit;
}

try {
    $sql = "SELECT * FROM $table WHERE 1=1";
    $params = [];

    if ($praticien) {
        $sql .= " AND Praticien = ?";
        $params[] = $praticien;
    }
    
    if ($mois) {
        $sql .= " AND Mois = ?";
        $params[] = $mois;
    }
    
    $sql .= " ORDER BY Mois DESC";
    
    if ($limit) {
        $sql .= " LIMIT ?";
        $params[] = $limit;
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'table' => $table,
        'data' => $data,
        'count' => count($data)
    ]);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Query failed',
        'message' => $e->getMessage()
    ]);
}
?>
