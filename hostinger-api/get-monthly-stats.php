<?php
/**
 * API: Statistiques mensuelles pour graphiques
 * GET /api/get-monthly-stats.php?praticien=JC&year=2025
 */
require_once 'config.php';

$praticien = $_GET['praticien'] ?? null;
$year = $_GET['year'] ?? date('Y');

try {
    $monthlyData = [];

    // Récupérer les données de réalisation par mois
    $sql = "SELECT 
                Mois,
                SUM(Montant_facture) as ca_facture,
                SUM(Montant_encaisse) as ca_encaisse,
                SUM(Nb_patients) as nb_patients
            FROM analyse_realisation 
            WHERE Mois LIKE ?";
    $params = [$year . '%'];
    
    if ($praticien) {
        $sql .= " AND Praticien = ?";
        $params[] = $praticien;
    }
    
    $sql .= " GROUP BY Mois ORDER BY Mois ASC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $realisationData = $stmt->fetchAll();

    // Récupérer les heures par mois
    $sql = "SELECT 
                Mois,
                SUM(Nb_heures) as nb_heures
            FROM analyse_jours_ouverts 
            WHERE Mois LIKE ?";
    $params = [$year . '%'];
    
    if ($praticien) {
        $sql .= " AND Praticien = ?";
        $params[] = $praticien;
    }
    
    $sql .= " GROUP BY Mois ORDER BY Mois ASC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $heuresData = $stmt->fetchAll();

    // Fusionner les données
    $heuresMap = [];
    foreach ($heuresData as $row) {
        $heuresMap[$row['Mois']] = $row['nb_heures'];
    }

    foreach ($realisationData as $row) {
        $mois = $row['Mois'];
        $monthlyData[] = [
            'mois' => $mois,
            'mois_label' => formatMois($mois),
            'ca_facture' => floatval($row['ca_facture']),
            'ca_encaisse' => floatval($row['ca_encaisse']),
            'nb_patients' => intval($row['nb_patients']),
            'nb_heures' => floatval($heuresMap[$mois] ?? 0),
            'ca_horaire' => isset($heuresMap[$mois]) && $heuresMap[$mois] > 0 
                ? round($row['ca_facture'] / ($heuresMap[$mois] / 60), 2) 
                : 0
        ];
    }

    echo json_encode([
        'success' => true,
        'year' => $year,
        'praticien' => $praticien,
        'data' => $monthlyData,
        'count' => count($monthlyData)
    ]);

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Query failed',
        'message' => $e->getMessage()
    ]);
}

function formatMois($mois) {
    $months = [
        '01' => 'Jan', '02' => 'Fév', '03' => 'Mar', '04' => 'Avr',
        '05' => 'Mai', '06' => 'Juin', '07' => 'Juil', '08' => 'Août',
        '09' => 'Sep', '10' => 'Oct', '11' => 'Nov', '12' => 'Déc'
    ];
    $m = substr($mois, 4, 2);
    $y = substr($mois, 0, 4);
    return ($months[$m] ?? $m) . ' ' . $y;
}
?>
