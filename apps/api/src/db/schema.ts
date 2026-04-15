import { pgTable, serial, text, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const providerEnum = pgEnum('provider', ['claude', 'gpt'])

// Tabela principal: cada análise de cartão de ponto
export const analises = pgTable('analises', {
  id:           serial('id').primaryKey(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  provider:     providerEnum('provider').notNull(),
  nomeArquivo:  text('nome_arquivo').notNull(),
  totalDias:    integer('total_dias').notNull(),
  csvContent:   text('csv_content').notNull(),
  avisos:       text('avisos').array().notNull().default(sql`'{}'`),
})

// Tabela de dias: cada linha do cartão (1 dia = 1 registro)
export const diasPonto = pgTable('dias_ponto', {
  id:         serial('id').primaryKey(),
  analiseId:  integer('analise_id').notNull().references(() => analises.id, { onDelete: 'cascade' }),
  data:       text('data').notNull(), // dd/MM/yyyy

  // Turno 1
  entrada1: text('entrada1').notNull().default(''),
  saida1:   text('saida1').notNull().default(''),
  // Turno 2
  entrada2: text('entrada2').notNull().default(''),
  saida2:   text('saida2').notNull().default(''),
  // Turno 3
  entrada3: text('entrada3').notNull().default(''),
  saida3:   text('saida3').notNull().default(''),
  // Turno 4
  entrada4: text('entrada4').notNull().default(''),
  saida4:   text('saida4').notNull().default(''),
  // Turno 5
  entrada5: text('entrada5').notNull().default(''),
  saida5:   text('saida5').notNull().default(''),
  // Turno 6
  entrada6: text('entrada6').notNull().default(''),
  saida6:   text('saida6').notNull().default(''),
})

// Tipos inferidos do schema
export type Analise    = typeof analises.$inferSelect
export type NovaAnalise = typeof analises.$inferInsert
export type DiaPontoRow = typeof diasPonto.$inferSelect
