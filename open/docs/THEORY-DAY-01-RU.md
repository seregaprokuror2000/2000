# Теория — день 1: от обязательства до settlement

Сегодняшняя цель — понять не Solana-код, а экономическую модель, которую код должен сохранять. После чтения ты должен своими словами объяснить, почему «подписанный voucher» и «полученные деньги» — разные состояния.

## 1. Деньги (Money)

Деньги одновременно служат единицей счёта, средством обмена и средством сохранения стоимости. В нашем прототипе единица расчёта — USDC, а суммы хранятся в минимальных единицах, чтобы не использовать неточную арифметику с плавающей точкой.

## 2. Обязательство (Obligation)

Обязательство означает, что одна сторона должна передать другой экономическую ценность. Оно может возникнуть раньше фактического движения денег. Оказанная API-услуга создаёт экономическое основание для требования оплаты, но сама по себе не доказывает, что платёж авторизован.

## 3. Principal и Agent

Principal — человек или организация, в интересах которых действует агент. Agent — программа, которой делегировали ограниченные полномочия. Деньги агента нельзя считать «его собственными»: важно хранить связь с principal, mandate и лимитами.

## 4. Mandate

Mandate — формализованное поручение: что агент вправе покупать, у кого, на какую сумму и до какого срока. Это экономический контекст платежа. Подпись подтверждает действие ключа, но не всегда доказывает соответствие намерению principal.

## 5. Authorization

Authorization отвечает на вопрос: «Имеет ли субъект право совершить это действие?» Это не settlement и не получение денег продавцом.

## 6. Escrow и collateral

Escrow — заблокированные правилами средства. Collateral — обеспечение обязательства. Депозит в payment channel ограничивает максимальную сумму, которую можно получить, но продавцу всё равно нужен действительный и сохранённый voucher.

## 7. Payment channel

Payment channel позволяет один раз внести средства on-chain, затем многократно обновлять состояние off-chain и позже провести итоговый settlement. Его задача — убрать отдельную blockchain-транзакцию из каждого микроплатежа.

## 8. Cumulative voucher

Voucher — подписанное разрешение потребовать сумму из канала. Cumulative означает, что voucher содержит общий итог, а не размер одного платежа. Voucher на 12 USDC заменяет предыдущий voucher на 10 USDC; экономический прирост равен 2 USDC.

Критическое правило:

```text
previous accepted < next accepted <= deposit
```

## 9. Service delivery

Service delivery — фактическое предоставление API-вызова, токенов модели, данных или другого ресурса. Если услуга оказана на 10 USDC, а надёжно сохранён voucher только на 9 USDC, возникает 1 USDC unsecured delivery.

## 10. Receivable

Receivable — сумма, которую продавец считает причитающейся. В нашей первоначальной модели:

```text
merchant receivable = delivered − distributed
```

Это исследовательская модель, а не готовое бухгалтерское заключение. Момент признания выручки зависит от договора и стандартов учёта.

## 11. Claimable amount

Claimable — сумма, которую можно предъявить для on-chain settlement на основании принятого voucher. Она не обязана совпадать с выручкой: возможны ошибки metering, задержки voucher или спорная услуга.

## 12. Clearing

Clearing — определение и согласование обязательств до окончательного расчёта. OpenClearing пытается нормализовать записи payer, merchant, facilitator и blockchain в одну проверяемую модель.

## 13. Settlement

Settlement — окончательное погашение платёжного обязательства по правилам системы. Подписанный voucher ещё не означает, что продавец получил доступные средства.

## 14. Distribution

В Solana payment-channel lifecycle settlement watermark может быть обновлён раньше фактического распределения средств. Поэтому различаем settled и distributed.

```text
settled <= accepted
distributed <= settled
```

## 15. Refund

Refund возвращает плательщику неиспользованное обеспечение. После распределения и возврата нельзя вывести больше первоначального финансирования:

```text
distributed + refunded <= funded
```

## 16. Exposure

Exposure — сумма, которую сторона может потерять при неблагоприятном событии. Для первой версии:

```text
unsettled exposure = max(accepted − settled, 0)
unsecured delivery = max(delivered − accepted, 0)
distribution backlog = max(settled − distributed, 0)
```

Это три разных риска, поэтому их нельзя объединять в один balance.

## 17. Reconciliation

Reconciliation — сопоставление независимых записей. Мы сравниваем:

- журнал оказанных услуг;
- принятые vouchers;
- on-chain settlement watermark;
- фактическую distribution;
- refund.

Совпадение blockchain-транзакции само по себе не доказывает, что внутренний учёт услуги верен.

## 18. Double-entry subledger

Двойная запись требует, чтобы каждая финансовая проводка имела равные debit и credit. Начальная исследовательская схема OpenClearing:

| Событие | Debit | Credit |
|---|---|---|
| Channel funded | Channel escrow asset | Payer refundable liability |
| Voucher accepted | Payer refundable liability | Merchant claimable liability |
| Claim confirmed | Merchant claimable liability | Merchant payable liability |
| Funds distributed | Merchant payable liability | Channel escrow asset |
| Payer refunded | Payer refundable liability | Channel escrow asset |

`SERVICE_DELIVERED` пока не создаёт проводку в settlement subledger: учёт выручки и себестоимости находится за его границей. Это решение мы должны проверить с практиками.

## 19. Invariant

Invariant — условие, которое обязано оставаться истинным при любой допустимой последовательности событий. Примеры:

```text
accepted <= funded
settled <= accepted
distributed <= settled
distributed + refunded <= funded
```

Нарушение инварианта важнее красивого dashboard: оно указывает на экономически невозможное или опасное состояние.

## 20. Idempotency

Idempotency означает, что повторная обработка одного события не меняет финансовый результат второй раз. Поэтому каждое событие имеет уникальный `id`; дубликат должен быть обнаружен.

## Контрольные вопросы

1. Почему депозит в 100 USDC ещё не является выручкой продавца?
2. Чем authorization отличается от settlement?
3. Почему cumulative voucher на 12 после voucher на 10 увеличивает обязательство только на 2?
4. Что означает `delivered > accepted`?
5. Чем `accepted`, `settled` и `distributed` отличаются друг от друга?
6. Почему off-chain voucher невозможно восстановить только из blockchain explorer?
7. Какой риск показывает `accepted − settled`?
8. Почему duplicate event опасен для ledger?
9. Что проверяет reconciliation?
10. Почему наша double-entry схема пока называется исследовательской?

## Практическое задание

Открой `examples/risky-session.json` и без запуска программы рассчитай пять показателей:

- merchant receivable;
- unsettled exposure;
- unsecured delivery;
- distribution backlog;
- remaining collateral.

После этого запусти `npm run demo` и сравни ответы.
