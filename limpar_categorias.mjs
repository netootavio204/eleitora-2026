import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dldbfrulueckrokhlzbg.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZGJmcnVsdWVja3Jva2hsemJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg4NTI2NCwiZXhwIjoyMDkyNDYxMjY0fQ.qRF_E4rhjH01-gPXCF5-hBlOSDt80Li9gqGTd6PE6cE'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const CATEGORIAS_VALIDAS = [
  'Justiça Eleitoral',
  'Candidatos e Partidos',
  'Eleitores e Mesários',
  'Poder Público',
  'Comunicação',
  'Outros'
]

async function main() {
  // 1. Ver distribuição atual
  console.log('\n=== CATEGORIAS ANTES DA LIMPEZA ===')
  // Buscar eventos e agrupar localmente
  const { data: todosEventos, error: errBusca } = await supabase
    .from('eventos')
    .select('id, categoria')

  if (errBusca) {
    console.error('Erro ao buscar eventos:', errBusca.message)
    process.exit(1)
  }

  const grupoCategorias = {}
  todosEventos.forEach(e => {
    grupoCategorias[e.categoria] = (grupoCategorias[e.categoria] || 0) + 1
  })

  console.log('Distribuição atual:')
  Object.entries(grupoCategorias)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      const valida = CATEGORIAS_VALIDAS.includes(cat) ? '✓' : '✗ INVÁLIDA'
      console.log(`  ${valida} "${cat}": ${count} eventos`)
    })

  const invalidos = todosEventos.filter(e => !CATEGORIAS_VALIDAS.includes(e.categoria))
  console.log(`\nTotal inválidos a deletar: ${invalidos.length}`)

  if (invalidos.length === 0) {
    console.log('Nenhum evento inválido encontrado. Banco já está limpo.')
  } else {
    // 2. Deletar eventos inválidos
    const idsInvalidos = invalidos.map(e => e.id)
    console.log('\n=== DELETANDO EVENTOS INVÁLIDOS ===')

    // Deletar em lotes de 100
    for (let i = 0; i < idsInvalidos.length; i += 100) {
      const lote = idsInvalidos.slice(i, i + 100)
      const { error: errDelete } = await supabase
        .from('eventos')
        .delete()
        .in('id', lote)

      if (errDelete) {
        console.error(`Erro ao deletar lote ${i}-${i+100}:`, errDelete.message)
        process.exit(1)
      }
      console.log(`  Deletados ${Math.min(i + 100, idsInvalidos.length)} de ${idsInvalidos.length}...`)
    }
    console.log(`✓ ${invalidos.length} eventos inválidos deletados`)
  }

  // 3. Confirmar resultado final
  console.log('\n=== CATEGORIAS APÓS LIMPEZA ===')
  const { data: depois, error: errDepois } = await supabase
    .from('eventos')
    .select('categoria')

  if (errDepois) {
    console.error('Erro:', errDepois.message)
    process.exit(1)
  }

  const grupoDepois = {}
  depois.forEach(e => {
    grupoDepois[e.categoria] = (grupoDepois[e.categoria] || 0) + 1
  })

  let totalRestante = 0
  Object.entries(grupoDepois)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  "${cat}": ${count} eventos`)
      totalRestante += count
    })

  console.log(`\nTotal de eventos válidos restantes: ${totalRestante}`)

  if (totalRestante < 100) {
    console.log('\n⚠️  ATENÇÃO: Menos de 100 eventos restantes! Recomenda-se refazer o scraping.')
  } else {
    console.log('\n✓ Banco de dados com categorias válidas.')
  }
}

main().catch(console.error)
