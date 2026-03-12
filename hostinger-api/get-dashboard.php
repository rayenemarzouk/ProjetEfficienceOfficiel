<?php
/**
 * API: Récupérer toutes les données du dashboard
 * GET /api/get-dashboard.php?praticien=JC
 */
require_once 'config.php';

$praticien = $_GET['praticien'] ?? null;

try {
    $dashboard = [
        'praticien' => $praticien,
        'jours_ouverts' => [],
        'realisation' => [],
        'rendezvous' => [],
        'devis' => [],
        'encours' => [],
        'stats' => []
    ];

    // Jours ouverts
    $sql = "SELECT * FROM analyse_jours_ouverts" . ($praticien ? " WHERE Praticien = ?" : "") . " ORDER BY Mois DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($praticien ? [$praticien] : []);
    $dashboard['jours_ouverts'] = $stmt->fetchAll();

    // Réalisation
    $sql = "SELECT * FROM analyse_realisation" . ($praticien ? " WHERE Praticien = ?" : "") . " ORDER BY Mois DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($praticien ? [$praticien] : []);
    $dashboard['realisation'] = $stmt->fetchAll();

    // Rendez-vous
    $sql = "SELECT * FROM analyse_rendezvous" . ($praticien ? " WHERE Praticien = ?" : "") . " ORDER BY Mois DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($praticien ? [$praticien] : []);
    $dashboard['rendezvous'] = $stmt->fetchAll();

    // Devis
    $sql = "SELECT * FROM analyse_devis" . ($praticien ? " WHERE Praticien = ?" : "") . " ORDER BY Mois DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($praticien ? [$praticien] : []);
    $dashboard['devis'] = $stmt->fetchAll();

    // Encours (global)
    $sql = "SELECT * FROM encours ORDER BY id DESC LIMIT 10";
    $stmt = $pdo->query($sql);
    $dashboard['encours'] = $stmt->fetchAll();

    // Statistiques calculées
    $dashboard['stats'] = calculateStats($dashboard, $praticien);

    echo json_encode([
        'success' => true,
        'data' => $dashboard,
        'timestamp' => date('c')
    ]);

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Query failed',
        'message' => $e->getMessage()
    ]);
}

/**
 * Calculer les statistiques agrégées
 */
function calculateStats($dashboard, $praticien) {
    $stats = [
        'total_heures' => 0,
        'total_ca_facture' => 0,
        'total_ca_encaisse' => 0,
        'total_patients' => 0,
        'total_rdv' => 0,
        'total_devis' => 0,
        'taux_acceptation' => 0,
        'ca_moyen_par_patient' => 0
    ];

    // Total heures
    foreach ($dashboard['jours_ouverts'] as $row) {
        $stats['total_heures'] += floatval($row['Nb_heures'] ?? $row['nb_heures'] ?? 0);
    }

    // Total CA
    foreach ($dashboard['realisation'] as $row) {
        $stats['total_ca_facture'] += floatval($row['Montant_facture'] ?? $row['montant_facture'] ?? 0);
        $stats['total_ca_encaisse'] += floatval($row['Montant_encaisse'] ?? $row['montant_encaisse'] ?? 0);
        $stats['total_patients'] += intval($row['Nb_patients'] ?? $row['nb_patients'] ?? 0);
    }

    // Total RDV
    foreach ($dashboard['rendezvous'] as $row) {
        $stats['total_rdv'] += intval($row['Nb_rdv'] ?? $row['nb_rdv'] ?? 0);
    }

    // Devis
    $totalDevis = 0;
    $totalAcceptes = 0;
    foreach ($dashboard['devis'] as $row) {
        $totalDevis += intval($row['Nb_devis'] ?? $row['nb_devis'] ?? 0);
        $totalAcceptes += intval($row['Nb_des_devis_acceptes'] ?? $row['nb_des_devis_acceptes'] ?? 0);
    }
    $stats['total_devis'] = $totalDevis;
    $stats['taux_acceptation'] = $totalDevis > 0 ? round(($totalAcceptes / $totalDevis) * 100, 1) : 0;

    // CA moyen par patient
    $stats['ca_moyen_par_patient'] = $stats['total_patients'] > 0 
        ? round($stats['total_ca_facture'] / $stats['total_patients'], 2) 
        : 0;

    return $stats;
}
?>
