/** Texte des CGU. Changer le contenu impose une nouvelle version en base (terms_versions). */
export const TERMS_VERSION = '2026-11-19'

const sections: { title: string; body: string[] }[] = [
  {
    title: '1. Objet',
    body: [
      "Les présentes conditions encadrent l'utilisation du site HeavenCases, qui permet d'ouvrir des caisses virtuelles contenant des skins Counter-Strike 2.",
    ],
  },
  {
    title: '2. Accès',
    body: [
      "Le site est réservé aux personnes âgées de 18 ans ou plus. La date de naissance est demandée à l'inscription ; un compte déclarant moins de 18 ans ne peut pas être activé.",
      "L'utilisateur s'engage à fournir des informations exactes. Une seule inscription est autorisée par personne.",
    ],
  },
  {
    title: '3. Compte',
    body: [
      "L'utilisateur est responsable de la confidentialité de ses identifiants et des actions effectuées depuis son compte.",
      'HeavenCases peut suspendre un compte en cas de fraude, de fausse déclaration ou de non-respect des présentes conditions.',
    ],
  },
  {
    title: '4. Crédits',
    body: [
      'Les crédits sont une monnaie virtuelle propre au site (1 crédit = 0,01 €). Ils servent à ouvrir des caisses et ne sont ni remboursables ni convertibles en argent.',
    ],
  },
  {
    title: '5. Ouverture des caisses',
    body: [
      "Le contenu de chaque caisse et la probabilité de chaque skin sont affichés avant l'achat. Le tirage est effectué par le serveur et peut être vérifié (provably fair) grâce à la server seed révélée, à la client seed et au nonce.",
      "Une caisse ouverte n'est pas remboursable.",
    ],
  },
  {
    title: '6. Inventaire et revente',
    body: [
      "Les skins obtenus sont ajoutés à l'inventaire. Ils peuvent être revendus contre des crédits à la valeur affichée ; la revente est définitive.",
    ],
  },
  {
    title: '7. Données personnelles',
    body: [
      "Les données collectées (pseudo, email, date de naissance, historique d'ouvertures et de transactions) servent uniquement au fonctionnement du compte et au respect de la condition d'âge.",
    ],
  },
  {
    title: '8. Modification des conditions',
    body: [
      'Toute nouvelle version des conditions doit être acceptée avant de continuer à utiliser le site. La date et la version acceptées sont enregistrées avec le compte.',
    ],
  },
]

export function TermsContent() {
  return (
    <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
      <p>Version du 19/11/2026</p>
      {sections.map((section) => (
        <section key={section.title} className="space-y-2">
          <h3 className="font-semibold text-foreground">{section.title}</h3>
          {section.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
    </div>
  )
}
