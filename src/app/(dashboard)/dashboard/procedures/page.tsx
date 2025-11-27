'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Stethoscope, Star, Clock } from 'lucide-react'

interface Procedure {
  id: string
  name: string
  category: string
  specialty: string
  difficulty: number
  estimatedTime: string | null
  indications: string[]
  steps: { number: number; instruction: string; tip?: string }[]
  pearls: string[]
}

// Default procedures for MVP (will be seeded to database)
const DEFAULT_PROCEDURES: Procedure[] = [
  {
    id: '1',
    name: 'Foley Catheter Insertion',
    category: 'General',
    specialty: 'All',
    difficulty: 2,
    estimatedTime: '10-15 min',
    indications: ['Urinary retention', 'Accurate urine output monitoring', 'Perioperative', 'Bladder irrigation'],
    steps: [
      { number: 1, instruction: 'Gather supplies: Foley kit, sterile gloves, cleaning solution', tip: 'Check balloon integrity before starting' },
      { number: 2, instruction: 'Position patient supine with legs spread (female) or supine (male)' },
      { number: 3, instruction: 'Clean periurethral area with betadine/chlorhexidine - front to back (female), circular motion (male)' },
      { number: 4, instruction: 'Apply sterile drapes' },
      { number: 5, instruction: 'Apply generous lubricant to catheter tip' },
      { number: 6, instruction: 'Insert catheter gently until urine returns', tip: 'Male: hold penis at 90 degrees, straighten urethra' },
      { number: 7, instruction: 'Advance another 2-3 cm after urine return' },
      { number: 8, instruction: 'Inflate balloon with 10mL sterile water' },
      { number: 9, instruction: 'Gently pull back until resistance felt' },
      { number: 10, instruction: 'Connect to drainage bag, secure to thigh' },
    ],
    pearls: ['Never force the catheter', 'In males, keep penis stretched to straighten urethra', 'Use coude tip for prostatic hypertrophy'],
  },
  {
    id: '2',
    name: 'Venipuncture / Blood Draw',
    category: 'General',
    specialty: 'All',
    difficulty: 1,
    estimatedTime: '5-10 min',
    indications: ['Laboratory testing', 'Blood cultures'],
    steps: [
      { number: 1, instruction: 'Apply tourniquet 3-4 inches above site' },
      { number: 2, instruction: 'Identify vein by palpation' },
      { number: 3, instruction: 'Clean site with alcohol, allow to dry' },
      { number: 4, instruction: 'Anchor vein by pulling skin taut' },
      { number: 5, instruction: 'Insert needle at 15-30 degree angle, bevel up' },
      { number: 6, instruction: 'Advance until flash of blood' },
      { number: 7, instruction: 'Fill tubes in correct order' },
      { number: 8, instruction: 'Release tourniquet before removing needle' },
      { number: 9, instruction: 'Apply pressure with gauze' },
    ],
    pearls: ['Anchor the vein well', 'Order of draw: Blood cultures, Light blue, Red, Gold, Green, Lavender, Gray'],
  },
  {
    id: '3',
    name: 'Arterial Blood Gas (Radial)',
    category: 'General',
    specialty: 'Medicine',
    difficulty: 3,
    estimatedTime: '5-10 min',
    indications: ['Respiratory failure assessment', 'Acid-base status', 'Ventilator management'],
    steps: [
      { number: 1, instruction: 'Perform Allen test to confirm ulnar collateral flow' },
      { number: 2, instruction: 'Position wrist in dorsiflexion over rolled towel' },
      { number: 3, instruction: 'Palpate radial pulse' },
      { number: 4, instruction: 'Clean site with alcohol' },
      { number: 5, instruction: 'Insert needle at 45 degree angle against blood flow' },
      { number: 6, instruction: 'Advance slowly until pulsatile blood return' },
      { number: 7, instruction: 'Allow syringe to fill passively' },
      { number: 8, instruction: 'Remove needle, apply firm pressure for 5 minutes' },
      { number: 9, instruction: 'Expel air bubbles, cap syringe, place on ice' },
    ],
    pearls: ['Always do Allen test first', 'Firm pressure for at least 5 min to prevent hematoma', 'Keep sample on ice for accurate results'],
  },
  {
    id: '4',
    name: 'Lumbar Puncture',
    category: 'Advanced',
    specialty: 'Medicine',
    difficulty: 4,
    estimatedTime: '20-30 min',
    indications: ['Meningitis workup', 'Subarachnoid hemorrhage', 'MS diagnosis', 'Intrathecal medications'],
    steps: [
      { number: 1, instruction: 'Position patient in lateral decubitus, fetal position, or sitting' },
      { number: 2, instruction: 'Identify L3-L4 or L4-L5 interspace (iliac crest level = L4)' },
      { number: 3, instruction: 'Sterilize area with chlorhexidine, apply drapes' },
      { number: 4, instruction: 'Anesthetize skin and deeper tissues with lidocaine' },
      { number: 5, instruction: 'Insert spinal needle with stylet, bevel facing up' },
      { number: 6, instruction: 'Advance toward umbilicus, slightly cephalad' },
      { number: 7, instruction: 'Feel for "pop" through ligamentum flavum and dura' },
      { number: 8, instruction: 'Remove stylet, confirm CSF flow' },
      { number: 9, instruction: 'Measure opening pressure with manometer' },
      { number: 10, instruction: 'Collect CSF in numbered tubes' },
      { number: 11, instruction: 'Replace stylet before removing needle' },
    ],
    pearls: ['Good positioning is key to success', 'If hitting bone, redirect slightly', 'Replace stylet before withdrawal to reduce headache risk'],
  },
  {
    id: '5',
    name: 'NG Tube Insertion',
    category: 'General',
    specialty: 'All',
    difficulty: 2,
    estimatedTime: '10-15 min',
    indications: ['Gastric decompression', 'Enteral feeding', 'GI bleeding lavage', 'Bowel obstruction'],
    steps: [
      { number: 1, instruction: 'Measure: nose to ear to xiphoid + 10cm' },
      { number: 2, instruction: 'Mark measurement on tube' },
      { number: 3, instruction: 'Position patient upright at 45-90 degrees' },
      { number: 4, instruction: 'Lubricate tube tip' },
      { number: 5, instruction: 'Insert through nostril, aim posterior' },
      { number: 6, instruction: 'When reaching pharynx, have patient sip water and swallow' },
      { number: 7, instruction: 'Advance with each swallow until mark reached' },
      { number: 8, instruction: 'Confirm placement: aspirate gastric contents, auscultate air insufflation' },
      { number: 9, instruction: 'Secure to nose and cheek' },
      { number: 10, instruction: 'Obtain XR to confirm position before feeding' },
    ],
    pearls: ['If patient coughs/chokes, withdraw and retry', 'Flexing neck may help passage', 'XR confirmation mandatory before feeding'],
  },
];

export default function ProceduresPage() {
  const [search, setSearch] = useState('')
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null)

  // For MVP, use default procedures. In production, fetch from API
  const procedures = DEFAULT_PROCEDURES.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.specialty.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Procedure Reference</h1>
        <p className="text-slate-400 mt-1">Quick access to procedure guides</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <Input
          placeholder="Search procedures..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Procedure List */}
        <div className="lg:col-span-1 space-y-3">
          {procedures.map((procedure) => (
            <Card
              key={procedure.id}
              hover
              className={`cursor-pointer ${
                selectedProcedure?.id === procedure.id ? 'border-blue-500/50' : ''
              }`}
              onClick={() => setSelectedProcedure(procedure)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-slate-200">{procedure.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="info">{procedure.specialty}</Badge>
                      <Badge variant="default">{procedure.category}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-400">
                    {[...Array(procedure.difficulty)].map((_, i) => (
                      <Star key={i} size={12} fill="currentColor" />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Procedure Detail */}
        <div className="lg:col-span-2">
          {selectedProcedure ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="text-blue-400" size={20} />
                    {selectedProcedure.name}
                  </CardTitle>
                  {selectedProcedure.estimatedTime && (
                    <Badge variant="default" className="flex items-center gap-1">
                      <Clock size={12} />
                      {selectedProcedure.estimatedTime}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Indications */}
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Indications</h4>
                  <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
                    {selectedProcedure.indications.map((ind, i) => (
                      <li key={i}>{ind}</li>
                    ))}
                  </ul>
                </div>

                {/* Steps */}
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Steps</h4>
                  <div className="space-y-3">
                    {selectedProcedure.steps.map((step) => (
                      <div key={step.number} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
                          {step.number}
                        </span>
                        <div>
                          <p className="text-sm text-slate-300">{step.instruction}</p>
                          {step.tip && (
                            <p className="text-xs text-yellow-400 mt-1">Tip: {step.tip}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pearls */}
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Clinical Pearls</h4>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <ul className="list-disc list-inside text-sm text-yellow-400 space-y-1">
                      {selectedProcedure.pearls.map((pearl, i) => (
                        <li key={i}>{pearl}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Stethoscope className="mx-auto text-slate-600 mb-4" size={48} />
                <p className="text-slate-500">Select a procedure to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
