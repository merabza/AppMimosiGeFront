//LessonGeneratorLog.tsx

import type { FC } from "react";
import { Table } from "react-bootstrap";
import { Link, useSearchParams } from "react-router-dom";
import Loading from "../appcarcass/common/Loading";
import AlertMessages from "../appcarcass/common/AlertMessages";
import { EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import { useAlert } from "../appcarcass/hooks/useAlert";
import { useGetLessonGeneratorLogQuery } from "../redux/api/lessonGeneratorApi";
import { formatDateTime } from "../studentContracts/dateFormat";
import {
    groupEditRoute,
    groupsMenuKey,
    useHasGroupsRight,
} from "../groups/groupsMenu";
import { lessonGeneratorLogRoute } from "./lessonGeneration";

//Access-ის LessonsCheckCreateErrorLogs: გენერატორის შეცდომები ჯგუფებად. ?grpId= მხოლოდ ერთ ჯგუფს აჩვენებს
const LessonGeneratorLog: FC = () => {
    const hasRight = useHasGroupsRight();
    const [searchParams] = useSearchParams();
    const grpIdParam = searchParams.get("grpId");
    const grpId = grpIdParam ? Number(grpIdParam) : undefined;
    const { data: rows, isLoading } = useGetLessonGeneratorLogQuery(grpId, {
        skip: !hasRight,
        refetchOnMountOrArgChange: true,
    });
    const [ApiLoadHaveErrors] = useAlert(EAlertKind.ApiLoad);

    if (hasRight === undefined) return <Loading />;

    if (!hasRight) return <h5>ჯგუფების ნახვის უფლება არ გაქვთ</h5>;

    if (ApiLoadHaveErrors)
        return (
            <div>
                <h5>ჩატვირთვის პრობლემა</h5>
                <AlertMessages alertKind={EAlertKind.ApiLoad} />
            </div>
        );

    if (isLoading || !rows) return <Loading />;

    return (
        <div>
            <h5>გაკვეთილების გენერატორის ლოგი</h5>
            <p>
                ლოგში ყოველი ჯგუფის მხოლოდ ბოლო გენერაციის შეცდომებია.{" "}
                {grpId === undefined ? (
                    <Link to={`/${groupsMenuKey}`}>ჯგუფები</Link>
                ) : (
                    <>
                        ნაჩვენებია ერთი ჯგუფი:{" "}
                        <Link to={`/${groupEditRoute}/${grpId}`}>
                            ჯგუფის გვერდი
                        </Link>
                        ,{" "}
                        <Link to={`/${lessonGeneratorLogRoute}`}>
                            ყველა ჯგუფის ლოგი
                        </Link>
                    </>
                )}
            </p>
            {rows.length === 0 ? (
                <p>შეცდომები არ არის.</p>
            ) : (
                <Table size="sm" bordered striped responsive>
                    <thead>
                        <tr>
                            <th>ჯგუფი</th>
                            <th>თარიღი</th>
                            <th>გაკვეთილი</th>
                            <th>შეცდომა</th>
                            <th>ჩაწერილია</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id}>
                                <td>
                                    <Link to={`/${groupEditRoute}/${row.grpId}`}>
                                        {row.groupCode}
                                    </Link>
                                </td>
                                <td>{formatDateTime(row.lessonDate)}</td>
                                <td>{row.lessonId ?? ""}</td>
                                <td>
                                    {row.errorCode}. {row.errorText}
                                </td>
                                <td>{formatDateTime(row.createdDate)}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}
        </div>
    );
};

export default LessonGeneratorLog;
