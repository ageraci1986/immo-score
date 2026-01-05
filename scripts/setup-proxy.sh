#!/bin/bash

# Script interactif pour configurer rapidement un proxy premium

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Configuration Interactive des Proxies Premium"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Votre IP (xxx.xxx.xxx.xxx) est bloquée par Immoweb."
echo "Vous devez configurer un proxy premium pour continuer."
echo ""
echo "Choisissez un service de proxy:"
echo ""
echo "1) WebShare (GRATUIT - Recommandé pour commencer)"
echo "2) IPRoyal (Budget résidentiel - ~$7)"
echo "3) Bright Data (Essai gratuit 7 jours)"
echo "4) Smartproxy"
echo "5) Oxylabs"
echo "6) Proxy-Seller"
echo "7) ScraperAPI"
echo "8) Custom Proxy"
echo "0) Quitter"
echo ""
read -p "Votre choix (0-8): " choice

case $choice in
  1)
    echo ""
    echo "📦 Configuration WebShare"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. Créez un compte sur: https://www.webshare.io/"
    echo "2. Allez dans Dashboard → Proxy → List"
    echo "3. Téléchargez au format: Username:Password:Endpoint:Port"
    echo "4. Le fichier contient des lignes comme:"
    echo "   user123:pass456:proxy1.webshare.io:80"
    echo ""
    read -p "Collez votre liste de proxies (séparés par des virgules): " proxies

    if [ -n "$proxies" ]; then
      echo "" >> .env
      echo "# WebShare Proxies - Added $(date)" >> .env
      echo "WEBSHARE_PROXY_LIST=$proxies" >> .env
      echo ""
      echo "✅ Configuration ajoutée au fichier .env"
      echo ""
      echo "Testez avec: node scripts/test-proxy-config.js"
    fi
    ;;

  2)
    echo ""
    echo "📦 Configuration IPRoyal"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. Créez un compte sur: https://iproyal.com/"
    echo "2. Achetez des proxies résidentiels"
    echo "3. Trouvez vos credentials dans le dashboard"
    echo ""
    read -p "Username: " username
    read -p "Password: " password

    if [ -n "$username" ] && [ -n "$password" ]; then
      echo "" >> .env
      echo "# IPRoyal Proxies - Added $(date)" >> .env
      echo "IPROYAL_USERNAME=$username" >> .env
      echo "IPROYAL_PASSWORD=$password" >> .env
      echo ""
      echo "✅ Configuration ajoutée au fichier .env"
      echo ""
      echo "Testez avec: node scripts/test-proxy-config.js"
    fi
    ;;

  3)
    echo ""
    echo "📦 Configuration Bright Data"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. Créez un compte sur: https://brightdata.com/"
    echo "2. Créez une zone résidentielle"
    echo "3. Le username a le format: brd-customer-XXXXX-zone-XXXXX"
    echo ""
    read -p "Username: " username
    read -p "Password: " password

    if [ -n "$username" ] && [ -n "$password" ]; then
      echo "" >> .env
      echo "# Bright Data Proxies - Added $(date)" >> .env
      echo "BRIGHTDATA_USERNAME=$username" >> .env
      echo "BRIGHTDATA_PASSWORD=$password" >> .env
      echo ""
      echo "✅ Configuration ajoutée au fichier .env"
      echo ""
      echo "Testez avec: node scripts/test-proxy-config.js"
    fi
    ;;

  4)
    echo ""
    echo "📦 Configuration Smartproxy"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    read -p "Username: " username
    read -p "Password: " password

    if [ -n "$username" ] && [ -n "$password" ]; then
      echo "" >> .env
      echo "# Smartproxy - Added $(date)" >> .env
      echo "SMARTPROXY_USERNAME=$username" >> .env
      echo "SMARTPROXY_PASSWORD=$password" >> .env
      echo "✅ Configuration ajoutée"
    fi
    ;;

  5)
    echo ""
    echo "📦 Configuration Oxylabs"
    read -p "Username: " username
    read -p "Password: " password

    if [ -n "$username" ] && [ -n "$password" ]; then
      echo "" >> .env
      echo "# Oxylabs - Added $(date)" >> .env
      echo "OXYLABS_USERNAME=$username" >> .env
      echo "OXYLABS_PASSWORD=$password" >> .env
      echo "✅ Configuration ajoutée"
    fi
    ;;

  6)
    echo ""
    echo "📦 Configuration Proxy-Seller"
    read -p "Host: " host
    read -p "Port: " port
    read -p "Username: " username
    read -p "Password: " password

    if [ -n "$host" ] && [ -n "$port" ]; then
      echo "" >> .env
      echo "# Proxy-Seller - Added $(date)" >> .env
      echo "PROXYSELLER_HOST=$host" >> .env
      echo "PROXYSELLER_PORT=$port" >> .env
      echo "PROXYSELLER_USERNAME=$username" >> .env
      echo "PROXYSELLER_PASSWORD=$password" >> .env
      echo "✅ Configuration ajoutée"
    fi
    ;;

  7)
    echo ""
    echo "📦 Configuration ScraperAPI"
    read -p "API Key: " apikey

    if [ -n "$apikey" ]; then
      echo "" >> .env
      echo "# ScraperAPI - Added $(date)" >> .env
      echo "SCRAPERAPI_KEY=$apikey" >> .env
      echo "✅ Configuration ajoutée"
    fi
    ;;

  8)
    echo ""
    echo "📦 Configuration Custom Proxy"
    echo "Format: http://username:password@host:port"
    read -p "Proxy URL: " proxyurl

    if [ -n "$proxyurl" ]; then
      echo "" >> .env
      echo "# Custom Proxy - Added $(date)" >> .env
      echo "CUSTOM_PROXY_URL=$proxyurl" >> .env
      echo "✅ Configuration ajoutée"
    fi
    ;;

  0)
    echo "Au revoir!"
    exit 0
    ;;

  *)
    echo "❌ Choix invalide"
    exit 1
    ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Configuration terminée!"
echo ""
echo "Prochaines étapes:"
echo "1. Testez: node scripts/test-proxy-config.js"
echo "2. Lancez: npm run dev"
echo "3. Ajoutez une URL Immoweb dans l'interface"
echo ""
echo "📖 Documentation complète: PROXY_SETUP_GUIDE.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
