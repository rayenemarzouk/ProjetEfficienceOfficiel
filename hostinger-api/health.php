<?php
/**
 * API: Health Check / Test de connexion
 * GET /api/health.php
 */
require_once 'config.php';

try {
    // Test de connexion à la BD
    $stmt = $pdo->query("SELECT 1");
    
    // Compter les enregistrements
    $counts = [];
    $tables = ['analyse_devis', 'analyse_jours_ouverts', 'analyse_realisation', 'analyse_rendezvous', 'encours'];
    
    foreach ($tables as $table) {
        $stmt = $pdo->query("SELECT COUNT(*) FROM $table");
        $counts[$table] = $stmt->fetchColumn();
    }

    echo json_encode([
        'success' => true,
        'status' => 'OK',
        'message' => 'API Efficience Analytics opérationnelle',
        'database' => 'connected',
        'tables' => $counts,
        'timestamp' => date('c'),
        'php_version' => phpversion()
    ]);

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'status' => 'ERROR',
        'message' => 'Erreur de connexion à la base de données',
        'error' => $e->getMessage()
    ]);
}
?>
